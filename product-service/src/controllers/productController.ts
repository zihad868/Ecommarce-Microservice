import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prismaClient';
import { getRedisClient } from '../utils/redisClient';
import { Prisma } from '@prisma/client';

// Cache TTL: 10 minutes for individual products
const PRODUCT_CACHE_TTL = 600;
// Cache TTL: 1 minute for product lists (changes more frequently)
const LIST_CACHE_TTL = 60;

export const createProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data = req.body as any;
    
    // Ensure attributes is passed correctly as JSON if it exists
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
      }
    });

    // Invalidate product list caches on create
    const redis = getRedisClient();
    const keys = await redis.keys('products:list:*');
    if (keys.length > 0) await redis.del(...keys);

    res.status(201).json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
};

export const getProducts = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const redis = getRedisClient();
    const cacheKey = `products:list:${JSON.stringify(req.query)}`;

    // Check Redis cache
    const cached = await redis.get(cacheKey);
    if (cached) {
      res.status(200).json(JSON.parse(cached));
      return;
    }

    const {
      page = '1',
      limit = '10',
      sort,
      search,
      category,
      minPrice,
      maxPrice,
    } = req.query as Record<string, string | undefined>;

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    // Build Prisma filter
    const where: Prisma.ProductWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
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

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const getProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const redis = getRedisClient();
    const cacheKey = `product:${req.params.id}`;

    const cached = await redis.get(cacheKey);
    if (cached) {
      res.status(200).json({ success: true, data: JSON.parse(cached) });
      return;
    }

    const product = await prisma.product.findUnique({
      where: { id: req.params.id as string },
    });
    
    if (!product) {
      res.status(404).json({ success: false, error: 'Product not found' });
      return;
    }

    await redis.setex(cacheKey, PRODUCT_CACHE_TTL, JSON.stringify(product));
    res.status(200).json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
};

export const updateProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const existing = await prisma.product.findUnique({ where: { id: req.params.id as string } });
    if (!existing) {
      res.status(404).json({ success: false, error: 'Product not found' });
      return;
    }

    const data = req.body as any;
    if (data.attributes && typeof data.attributes !== 'object') {
       data.attributes = JSON.parse(data.attributes);
    }

    const product = await prisma.product.update({
      where: { id: req.params.id as string },
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
    await redis.del(`product:${req.params.id}`);
    const listKeys = await redis.keys('products:list:*');
    if (listKeys.length > 0) await redis.del(...listKeys);

    res.status(200).json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
};

export const deleteProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const existing = await prisma.product.findUnique({ where: { id: req.params.id as string } });
    if (!existing) {
      res.status(404).json({ success: false, error: 'Product not found' });
      return;
    }

    const product = await prisma.product.delete({
      where: { id: req.params.id as string }
    });

    // Invalidate caches
    const redis = getRedisClient();
    await redis.del(`product:${req.params.id}`);
    const listKeys = await redis.keys('products:list:*');
    if (listKeys.length > 0) await redis.del(...listKeys);

    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    next(err);
  }
};
