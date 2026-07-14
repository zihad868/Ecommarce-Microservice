import { Request, Response, NextFunction } from 'express';
import Product, { IProduct } from '../models/Product';
import { getRedisClient } from '../utils/redisClient';

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
    const product = await Product.create(req.body as Partial<IProduct>);

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

    // Build MongoDB filter
    const filter: Record<string, unknown> = {};

    if (search) filter.$text = { $search: search };
    if (category) filter.category = category;

    if (minPrice !== undefined || maxPrice !== undefined) {
      const priceFilter: Record<string, number> = {};
      if (minPrice !== undefined) priceFilter.$gte = Number(minPrice);
      if (maxPrice !== undefined) priceFilter.$lte = Number(maxPrice);
      filter.price = priceFilter;
    }

    // Sorting
    let sortObj: Record<string, 1 | -1> = { createdAt: -1 };
    if (sort) {
      const [field, order] = sort.split(':');
      if (field) sortObj = { [field]: order === 'asc' ? 1 : -1 };
    }

    const products = await Product.find(filter)
      .sort(sortObj)
      .skip(skip)
      .limit(take)
      .lean();

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

    const product = await Product.findById(req.params.id).lean();
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
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body as Partial<IProduct>,
      { new: true, runValidators: true }
    );
    if (!product) {
      res.status(404).json({ success: false, error: 'Product not found' });
      return;
    }

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
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      res.status(404).json({ success: false, error: 'Product not found' });
      return;
    }

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
