import { Router } from 'express';
import { validateRequest } from '@ecommerce/common';
import {
  createOrder,
  getOrderById,
  getOrders,
  payOrder,
  updateOrderStatus,
} from '../controllers/orderController';
import { protect } from '../middlewares/authMiddleware';
import {
  createOrderSchema,
  listOrdersQuerySchema,
  orderIdParamSchema,
  payOrderSchema,
  updateOrderStatusSchema,
} from '../validators/orderValidators';

const router = Router();

router.get('/', protect, validateRequest({ query: listOrdersQuerySchema }), getOrders);

router.post('/', protect, validateRequest({ body: createOrderSchema }), createOrder);

router.get('/:id', protect, validateRequest({ params: orderIdParamSchema }), getOrderById);

router.patch(
  '/:id/status',
  protect,
  validateRequest({
    params: orderIdParamSchema,
    body: updateOrderStatusSchema,
  }),
  updateOrderStatus,
);

router.post(
  '/:id/pay',
  protect,
  validateRequest({
    params: orderIdParamSchema,
    body: payOrderSchema,
  }),
  payOrder,
);

export default router;
