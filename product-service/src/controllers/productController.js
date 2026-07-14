const Product = require('../models/Product');
const { getRedisClient } = require('../utils/redisClient');

// Cache TTL: 10 minutes for individual products
const PRODUCT_CACHE_TTL = 600;
// Cache TTL: 1 minute for product lists (changes more frequently)
const LIST_CACHE_TTL = 60;

exports.createProduct = async (req, res, next) => {
  try {
    const product = await Product.create(req.body);

    // Invalidate product list caches on create
    const redis = getRedisClient();
    const keys = await redis.keys('products:list:*');
    if (keys.length > 0) await redis.del(...keys);

    res.status(201).json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
};

exports.getProducts = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, sort, search, category, minPrice, maxPrice } = req.query;
    const redis = getRedisClient();
    const cacheKey = `products:list:${JSON.stringify(req.query)}`;

    // Check cache
    const cached = await redis.get(cacheKey);
    if (cached) {
      return res.status(200).json(JSON.parse(cached));
    }

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    // Build MongoDB query filter
    const filter = {};

    // Full-text search using MongoDB text index
    if (search) {
      filter.$text = { $search: search };
    }
    if (category) {
      filter.category = category;
    }
    // Price range filter
    if (minPrice !== undefined || maxPrice !== undefined) {
      filter.price = {};
      if (minPrice !== undefined) filter.price.$gte = Number(minPrice);
      if (maxPrice !== undefined) filter.price.$lte = Number(maxPrice);
    }

    // Sorting
    let sortObj = { createdAt: -1 }; // default: newest first
    if (sort) {
      const [field, order] = sort.split(':');
      if (field) sortObj = { [field]: order === 'asc' ? 1 : -1 };
    }

    const products = await Product.find(filter)
      .sort(sortObj)
      .skip(skip)
      .limit(take)
      .lean(); // lean() returns plain JS objects — faster for reads

    const result = { success: true, count: products.length, data: products };

    // Cache result
    await redis.setex(cacheKey, LIST_CACHE_TTL, JSON.stringify(result));

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

exports.getProduct = async (req, res, next) => {
  try {
    const redis = getRedisClient();
    const cacheKey = `product:${req.params.id}`;

    // Check Redis cache first
    const cached = await redis.get(cacheKey);
    if (cached) {
      return res.status(200).json({ success: true, data: JSON.parse(cached) });
    }

    const product = await Product.findById(req.params.id).lean();
    if (!product) return res.status(404).json({ success: false, error: 'Product not found' });

    // Cache for 10 minutes
    await redis.setex(cacheKey, PRODUCT_CACHE_TTL, JSON.stringify(product));

    res.status(200).json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
};

exports.updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!product) return res.status(404).json({ success: false, error: 'Product not found' });

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

exports.deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ success: false, error: 'Product not found' });

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
