import httpStatus from 'http-status';
import { ApiError } from '@ecommerce/common';
import prisma, { Prisma, type Product } from '../utils/prismaClient';
import { getRedisClient } from '../utils/redisClient';
import type {
  CreateProductInput,
  ListProductsQuery,
  UpdateProductInput,
} from '../validators/productValidators';

const PRODUCT_CACHE_TTL = 600; // 10 minutes
const LIST_CACHE_TTL = 60; // 1 minute

const getListVersion = async (): Promise<string> => {
  try {
    const redis = getRedisClient();
    const version = await redis.get('products:list:version');
    if (!version) {
      await redis.set('products:list:version', '1');
      return '1';
    }
    return version;
  } catch {
    return '1';
  }
};

const invalidateListCache = async (): Promise<void> => {
  try {
    const redis = getRedisClient();
    await redis.incr('products:list:version');
  } catch (err) {
    console.warn('[Cache] Failed to increment list cache version:', err);
  }
};

const invalidateProductCache = async (productId: string): Promise<void> => {
  try {
    const redis = getRedisClient();
    await redis.del(`product:${productId}`);
    await invalidateListCache();
  } catch (err) {
    console.warn('[Cache] Failed to invalidate product cache:', err);
  }
};

export const createProduct = async (data: CreateProductInput): Promise<Product> => {
  const product = await prisma.product.create({
    data: {
      name: data.name,
      description: data.description,
      price: new Prisma.Decimal(data.price),
      stock: data.stock,
      category: data.category,
      attributes: (data.attributes as object | undefined) ?? {},
    },
  });

  await invalidateListCache();
  return product;
};

export const getProducts = async (query: ListProductsQuery) => {
  const page = query.page;
  const limit = Math.min(query.limit, 100);
  const skip = (page - 1) * limit;

  const version = await getListVersion();
  const cacheKey = `products:list:v${version}:${String(page)}:${String(limit)}:${query.category ?? ''}:${query.search ?? ''}:${query.minPrice !== undefined ? String(query.minPrice) : ''}:${query.maxPrice !== undefined ? String(query.maxPrice) : ''}:${query.sortBy}:${query.sortOrder}`;

  try {
    const redis = getRedisClient();
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as {
        products: Product[];
        meta: { page: number; limit: number; total: number; totalPages: number };
      };
    }
  } catch (err) {
    console.warn('[Cache] Redis get error on getProducts:', err);
  }

  const where: Prisma.ProductWhereInput = {};

  if (query.category) {
    where.category = { equals: query.category, mode: 'insensitive' };
  }

  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: 'insensitive' } },
      { description: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    where.price = {};
    if (query.minPrice !== undefined) {
      where.price.gte = new Prisma.Decimal(query.minPrice);
    }
    if (query.maxPrice !== undefined) {
      where.price.lte = new Prisma.Decimal(query.maxPrice);
    }
  }

  const orderBy: Prisma.ProductOrderByWithRelationInput = {
    [query.sortBy]: query.sortOrder,
  };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take: limit,
      orderBy,
    }),
    prisma.product.count({ where }),
  ]);

  const result = {
    products,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };

  try {
    const redis = getRedisClient();
    await redis.setex(cacheKey, LIST_CACHE_TTL, JSON.stringify(result));
  } catch (err) {
    console.warn('[Cache] Redis set error on getProducts:', err);
  }

  return result;
};

export const getProductById = async (id: string): Promise<Product | null> => {
  const cacheKey = `product:${id}`;

  try {
    const redis = getRedisClient();
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as Product;
    }
  } catch (err) {
    console.warn('[Cache] Redis get error on getProductById:', err);
  }

  const product = await prisma.product.findUnique({ where: { id } });

  if (product) {
    try {
      const redis = getRedisClient();
      await redis.setex(cacheKey, PRODUCT_CACHE_TTL, JSON.stringify(product));
    } catch (err) {
      console.warn('[Cache] Redis set error on getProductById:', err);
    }
  }

  return product;
};

export const updateProduct = async (id: string, data: UpdateProductInput): Promise<Product> => {
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Product not found');
  }

  const updateData: Prisma.ProductUpdateInput = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.price !== undefined) updateData.price = new Prisma.Decimal(data.price);
  if (data.stock !== undefined) updateData.stock = data.stock;
  if (data.category !== undefined) updateData.category = data.category;
  if (data.attributes !== undefined) {
    updateData.attributes = data.attributes as object;
  }

  const product = await prisma.product.update({
    where: { id },
    data: updateData,
  });

  await invalidateProductCache(id);
  return product;
};

export const deleteProduct = async (id: string): Promise<void> => {
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Product not found');
  }

  await prisma.product.delete({ where: { id } });
  await invalidateProductCache(id);
};

/**
 * Decrements stock atomically using conditional SQL inside an existing Prisma transaction.
 * Call this from within a `prisma.$transaction(async (tx) => ...)` block.
 */
export const decrementProductStockTx = async (
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  productId: string,
  quantity: number,
): Promise<void> => {
  if (quantity <= 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Quantity must be positive');
  }

  const updatedCount = await tx.$executeRaw`
    UPDATE "Product"
    SET "stock" = "stock" - ${quantity}, "updatedAt" = NOW()
    WHERE "id" = ${productId} AND "stock" >= ${quantity}
  `;

  if (updatedCount === 0) {
    const current = await tx.product.findUnique({ where: { id: productId } });
    if (!current) {
      throw new ApiError(httpStatus.NOT_FOUND, `Product ${productId} not found`);
    }
    throw new ApiError(
      httpStatus.CONFLICT,
      `Insufficient stock for product ${current.name}. Available: ${String(current.stock)}, requested: ${String(quantity)}`,
    );
  }
};

/**
 * Standalone version — wraps decrementProductStockTx in its own transaction.
 * Use this when you don't already have a Prisma tx context (e.g. ad-hoc admin calls).
 * The Kafka consumer should use decrementProductStockTx directly inside its own transaction.
 */
export const decrementProductStock = async (productId: string, quantity: number): Promise<void> => {
  await prisma.$transaction(async (tx) => {
    await decrementProductStockTx(tx, productId, quantity);
  });
  await invalidateProductCache(productId);
};
