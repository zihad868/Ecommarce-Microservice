import { Router } from 'express';
import { requireRole, validateRequest } from '@ecommerce/common';
import {
  createProduct,
  deleteProduct,
  getProduct,
  getProducts,
  updateProduct,
} from '../controllers/productController';
import { protect } from '../middlewares/authMiddleware';
import {
  createProductSchema,
  listProductsQuerySchema,
  productIdParamSchema,
  updateProductSchema,
} from '../validators/productValidators';

const router = Router();

router.get('/', validateRequest({ query: listProductsQuerySchema }), getProducts);

router.post(
  '/',
  protect,
  requireRole('ADMIN'),
  validateRequest({ body: createProductSchema }),
  createProduct,
);

router.get('/:id', validateRequest({ params: productIdParamSchema }), getProduct);

router.put(
  '/:id',
  protect,
  requireRole('ADMIN'),
  validateRequest({ params: productIdParamSchema, body: updateProductSchema }),
  updateProduct,
);

router.delete(
  '/:id',
  protect,
  requireRole('ADMIN'),
  validateRequest({ params: productIdParamSchema }),
  deleteProduct,
);

export default router;
