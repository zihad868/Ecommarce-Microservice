const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.createProduct = async (req, res, next) => {
  try {
    const product = await prisma.product.create({
      data: req.body
    });
    res.status(201).json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
};

exports.getProducts = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, sort, search, ...filters } = req.query;
    
    // Pagination
    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    // Sorting
    let orderBy = { createdAt: 'desc' };
    if (sort) {
      const [field, order] = sort.split(':'); // e.g., price:asc
      if (field) orderBy = { [field]: order || 'asc' };
    }

    // Search and Filtering
    let where = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    // Add basic equality filters (e.g., category=electronics)
    for (const key in filters) {
      if (['price', 'stock'].includes(key)) {
        where[key] = Number(filters[key]);
      } else {
        where[key] = filters[key];
      }
    }

    const products = await prisma.product.findMany({
      where,
      orderBy,
      skip,
      take
    });
    
    res.status(200).json({ success: true, count: products.length, data: products });
  } catch (err) {
    next(err);
  }
};

exports.getProduct = async (req, res, next) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: Number(req.params.id) }
    });
    if (!product) return res.status(404).json({ success: false, error: 'Product not found' });
    res.status(200).json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
};

exports.updateProduct = async (req, res, next) => {
  try {
    let product = await prisma.product.findUnique({ where: { id: Number(req.params.id) } });
    if (!product) return res.status(404).json({ success: false, error: 'Product not found' });

    product = await prisma.product.update({
      where: { id: Number(req.params.id) },
      data: req.body
    });

    res.status(200).json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
};

exports.deleteProduct = async (req, res, next) => {
  try {
    const product = await prisma.product.findUnique({ where: { id: Number(req.params.id) } });
    if (!product) return res.status(404).json({ success: false, error: 'Product not found' });

    await prisma.product.delete({
      where: { id: Number(req.params.id) }
    });
    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    next(err);
  }
};
