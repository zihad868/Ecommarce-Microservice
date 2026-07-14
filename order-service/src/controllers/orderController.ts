import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { getProductDetails } from '../grpc/grpcClients';
import { publishEvent } from '../events/rabbitmq';

const prisma = new PrismaClient();

interface OrderItemInput {
  productId: string;
  quantity: number;
}

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

    let totalAmount = 0;
    const validatedItems = [];

    // Check each product via gRPC
    for (const item of items) {
      const productResponse = await getProductDetails(item.productId);

      if (!productResponse.success) {
        res.status(404).json({
          success: false,
          error: `Product ${item.productId} not found`,
        });
        return;
      }

      if (productResponse.stock < item.quantity) {
        res.status(400).json({
          success: false,
          error: `Insufficient stock for product ${productResponse.name}`,
        });
        return;
      }

      totalAmount += productResponse.price * item.quantity;
      validatedItems.push({
        productId: String(item.productId),
        quantity: Number(item.quantity),
        price: productResponse.price,
      });
    }

    const order = await prisma.order.create({
      data: {
        userId: req.user!.id,
        totalAmount,
        status: 'COMPLETED',
        items: {
          create: validatedItems,
        },
      },
      include: {
        items: true,
      },
    });

    // Publish Event to RabbitMQ
    await publishEvent('order.created', {
      orderId: order.id,
      items: validatedItems,
    });

    res.status(201).json({ success: true, data: order });
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
    const orders = await prisma.order.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      include: { items: true },
    });
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
    const order = await prisma.order.findFirst({
      where: {
        id: req.params.id as string,
        userId: req.user!.id,
      },
      include: { items: true },
    });

    if (!order) {
      res.status(404).json({ success: false, error: 'Order not found' });
      return;
    }
    res.status(200).json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
};
