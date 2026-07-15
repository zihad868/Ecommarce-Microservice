import { Request, Response, NextFunction } from 'express';
import * as orderService from '../services/orderService';
import { OrderItemInput } from '../services/orderService';

interface OrderRequestBody {
  items: OrderItemInput[];
}

export const createOrder = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { items } = req.body as OrderRequestBody;
    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ success: false, error: 'Order items are required' });
      return;
    }

    try {
      const order = await orderService.createOrder(req.user!.id, items);
      res.status(201).json({ success: true, data: order });
    } catch (err: any) {
      if (err.message.includes('not found') || err.message.includes('Insufficient stock')) {
        res.status(400).json({ success: false, error: err.message });
      } else {
        throw err;
      }
    }
  } catch (err) {
    next(err);
  }
};

export const getOrders = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const orders = await orderService.getOrdersByUserId(req.user!.id);
    res.status(200).json({ success: true, count: orders.length, data: orders });
  } catch (err) {
    next(err);
  }
};

export const getOrderById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const order = await orderService.getOrderByIdAndUser(req.params.id as string, req.user!.id);

    if (!order) {
      res.status(404).json({ success: false, error: 'Order not found' });
      return;
    }
    res.status(200).json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
};
