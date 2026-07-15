import prisma from '../utils/prismaClient';
import { getRedisClient } from '../utils/redisClient';
import { Prisma } from '@prisma/client';

// Cache TTL: 10 minutes for individual products
const PRODUCT_CACHE_TTL = 600;
// Cache TTL: 1 minute for product lists (changes more frequently)
const LIST_CACHE_TTL = 60;

export const createProduct = async (data: any) => {
  if (data.attributes && typeof data.attributes !== 'object') {
    data.attributes = JSON.parse(data.attributes);
  }

  const product = await prisma.product.create({
    data: {
      name: data.name,
      description: data.description,
      price: data.price,
      stock: data.stock,
      category: data.category,
      attributes: data.attributes || {},
    },
  });

  // Invalidate product list caches on create
  const redis = getRedisClient();
  const keys = await redis.keys('products:list:*');
  if (keys.length > 0) await redis.del(...keys);

  return product;
};

export const getProducts = async (query: Record<string, string | undefined>) => {
  const redis = getRedisClient();
  const cacheKey = `products:list:${JSON.stringify(query)}`;

  // Check Redis cache
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  const {
    page = '1',
    limit = '10',
    sort,
    search,
    category,
    minPrice,
    maxPrice,
  } = query;

  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  // Build Prisma filter
  const where: Prisma.ProductWhereInput = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (category) {
    where.category = category;
  }

  if (minPrice !== undefined || maxPrice !== undefined) {
    where.price = {};
    if (minPrice !== undefined) where.price.gte = Number(minPrice);
    if (maxPrice !== undefined) where.price.lte = Number(maxPrice);
  }

  // Sorting
  let orderBy: Prisma.ProductOrderByWithRelationInput = { createdAt: 'desc' };
  if (sort) {
    const [field, order] = sort.split(':');
    if (field) {
      orderBy = { [field]: order === 'asc' ? 'asc' : 'desc' };
    }
  }

  const products = await prisma.product.findMany({
    where,
    orderBy,
    skip,
    take,
  });

  const result = { success: true, count: products.length, data: products };
  await redis.setex(cacheKey, LIST_CACHE_TTL, JSON.stringify(result));

  return result;
};

export const getProductById = async (id: string) => {
  const redis = getRedisClient();
  const cacheKey = `product:${id}`;

  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  const product = await prisma.product.findUnique({
    where: { id },
  });

  if (!product) {
    return null;
  }

  await redis.setex(cacheKey, PRODUCT_CACHE_TTL, JSON.stringify(product));
  return product;
};

export const updateProduct = async (id: string, data: any) => {
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) {
    return null;
  }

  if (data.attributes && typeof data.attributes !== 'object') {
    data.attributes = JSON.parse(data.attributes);
  }

  const product = await prisma.product.update({
    where: { id },
    data: {
      name: data.name,
      description: data.description,
      price: data.price,
      stock: data.stock,
      category: data.category,
      attributes: data.attributes,
    },
  });

  // Invalidate caches
  const redis = getRedisClient();
  await redis.del(`product:${id}`);
  const listKeys = await redis.keys('products:list:*');
  if (listKeys.length > 0) await redis.del(...listKeys);

  return product;
};

export const deleteProduct = async (id: string) => {
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) {
    return null;
  }

  await prisma.product.delete({
    where: { id },
  });

  // Invalidate caches
  const redis = getRedisClient();
  await redis.del(`product:${id}`);
  const listKeys = await redis.keys('products:list:*');
  if (listKeys.length > 0) await redis.del(...listKeys);

  return true;
};

export const decrementProductStock = async (id: string, decrementBy: number) => {
  const product = await prisma.product.update({
    where: { id },
    data: {
      stock: {
        decrement: decrementBy,
      },
    },
  });

  // Invalidate Redis product cache since stock has changed
  const redis = getRedisClient();
  await redis.del(`product:${id}`);
  
  // Note: List caches should probably be invalidated in the caller if needed
  return product;
};
