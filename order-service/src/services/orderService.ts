import { PrismaClient } from '@prisma/client';
import { getProductDetails } from '../grpc/grpcClients';
import { publishEvent } from '../events/rabbitmq';

const prisma = new PrismaClient();

export interface OrderItemInput {
  productId: string;
  quantity: number;
}

export const createOrder = async (userId: string, items: OrderItemInput[]) => {
  let totalAmount = 0;
  const validatedItems = [];

  // Check each product via gRPC
  for (const item of items) {
    const productResponse = await getProductDetails(item.productId);

    if (!productResponse.success) {
      throw new Error(`Product ${item.productId} not found`);
    }

    if (productResponse.stock < item.quantity) {
      throw new Error(`Insufficient stock for product ${productResponse.name}`);
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
      userId,
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

  return order;
};

export const getOrdersByUserId = async (userId: string) => {
  return await prisma.order.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: { items: true },
  });
};

export const getOrderByIdAndUser = async (orderId: string, userId: string) => {
  return await prisma.order.findFirst({
    where: {
      id: orderId,
      userId,
    },
    include: { items: true },
  });
};
