import httpStatus from 'http-status';
import { v4 as uuidv4 } from 'uuid';
import { ApiError, type OrderCreatedEvent, type OrderItemEvent } from '@ecommerce/common';
import prisma, { OrderStatus, Prisma, type Order } from '../utils/prismaClient';
import { getProductDetails } from '../grpc/grpcClients';
import { validateTransition } from './orderStateMachine';
import type {
  CreateOrderItemInput,
  ListOrdersQuery,
  PayOrderInput,
  UpdateOrderStatusInput,
} from '../validators/orderValidators';
import { logger } from '../utils/logger';

export const createOrder = async (
  userId: string,
  items: CreateOrderItemInput[],
  idempotencyKey?: string,
): Promise<Order> => {
  // 1. Idempotency Key check — scoped to userId to prevent cross-user leakage
  if (idempotencyKey) {
    const existing = await prisma.idempotencyRecord.findUnique({
      where: { userId_key: { userId, key: idempotencyKey } },
    });
    if (existing) {
      logger.info({ idempotencyKey, userId }, 'Returning cached order for idempotency key');
      return existing.response as unknown as Order;
    }
  }

  // 2. Validate stock and fetch current price for each product via gRPC
  let totalAmount = new Prisma.Decimal(0);
  const validatedItems: {
    productId: string;
    quantity: number;
    price: Prisma.Decimal;
    name: string;
  }[] = [];

  for (const item of items) {
    let productResponse;
    try {
      productResponse = await getProductDetails(item.productId);
    } catch (grpcErr) {
      const msg = grpcErr instanceof Error ? grpcErr.message : String(grpcErr);
      throw new ApiError(httpStatus.SERVICE_UNAVAILABLE, `Product Service unavailable: ${msg}`);
    }

    if (!productResponse.success) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        productResponse.error || `Product ${item.productId} not found`,
      );
    }

    if (productResponse.stock < item.quantity) {
      throw new ApiError(
        httpStatus.CONFLICT,
        `Insufficient stock for product '${productResponse.name}'. Available: ${String(
          productResponse.stock,
        )}, Requested: ${String(item.quantity)}`,
      );
    }

    const itemPrice = new Prisma.Decimal(productResponse.price);
    const lineTotal = itemPrice.mul(item.quantity);
    totalAmount = totalAmount.add(lineTotal);

    validatedItems.push({
      productId: item.productId,
      quantity: item.quantity,
      price: itemPrice,
      name: productResponse.name,
    });
  }

  // 3. Execute atomic transaction: Order + OrderItems + OutboxEvent + IdempotencyRecord
  const eventId = uuidv4();

  try {
    const createdOrder = await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          userId,
          totalAmount,
          status: OrderStatus.PENDING,
          idempotencyKey,
          items: {
            create: validatedItems.map((vi) => ({
              productId: vi.productId,
              quantity: vi.quantity,
              price: vi.price,
            })),
          },
        },
        include: {
          items: true,
        },
      });

      const eventPayload: OrderCreatedEvent = {
        eventId,
        version: 1,
        eventType: 'OrderCreated',
        timestamp: new Date().toISOString(),
        orderId: order.id,
        userId,
        items: validatedItems.map((vi): OrderItemEvent => ({
          productId: vi.productId,
          quantity: vi.quantity,
          price: Number(vi.price),
        })),
        totalAmount: Number(totalAmount),
      };

      await tx.outboxEvent.create({
        data: {
          id: eventId,
          aggregateId: order.id,
          eventType: 'OrderCreated',
          payload: eventPayload,
        },
      });

      if (idempotencyKey) {
        await tx.idempotencyRecord.create({
          data: {
            key: idempotencyKey,
            userId,
            requestHash: '',
            statusCode: 201,
            response: order,
          },
        });
      }

      return order;
    });

    return createdOrder;
  } catch (err) {
    // Handle race: two concurrent requests with the same (key, userId) — first one wins.
    // Prisma wraps Postgres P2002 (unique violation) as PrismaClientKnownRequestError.
    if (
      idempotencyKey &&
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2002'
    ) {
      logger.warn(
        { idempotencyKey, userId },
        'Concurrent idempotency race detected, returning stored result',
      );
      const existing = await prisma.idempotencyRecord.findUnique({
        where: { userId_key: { userId, key: idempotencyKey } },
      });
      if (existing) return existing.response as unknown as Order;
    }
    throw err;
  }
};

export const getOrders = async (userId: string, userRole: string, query: ListOrdersQuery) => {
  const page = query.page;
  const limit = Math.min(query.limit, 100);
  const skip = (page - 1) * limit;

  const where: Prisma.OrderWhereInput = {};
  if (userRole !== 'ADMIN') {
    where.userId = userId;
  }
  if (query.status) {
    where.status = query.status;
  }

  // Cursor pagination support
  let cursorObj: Prisma.OrderWhereUniqueInput | undefined;
  if (query.cursor) {
    cursorObj = { id: query.cursor };
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      skip: cursorObj ? 1 : skip,
      cursor: cursorObj,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { items: true },
    }),
    prisma.order.count({ where }),
  ]);

  const nextCursor = orders.length === limit ? orders[orders.length - 1]?.id : null;

  return {
    orders,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      nextCursor,
    },
  };
};

export const getOrderById = async (
  orderId: string,
  userId: string,
  userRole: string,
): Promise<Order> => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Order not found');
  }

  if (userRole !== 'ADMIN' && order.userId !== userId) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      'Forbidden: You are not authorized to view this order',
    );
  }

  return order;
};

export const updateOrderStatus = async (
  orderId: string,
  input: UpdateOrderStatusInput,
  userId: string,
  userRole: string,
): Promise<Order> => {
  const order = await getOrderById(orderId, userId, userRole);

  const targetStatus = input.status;

  // RBAC: non-ADMIN users may only CANCEL their own PENDING or CONFIRMED orders.
  // Any other transition (e.g. PAID, SHIPPED, COMPLETED) requires ADMIN.
  if (userRole !== 'ADMIN') {
    const allowedForUser: OrderStatus[] = [OrderStatus.CANCELLED];
    const allowedFromStatuses: OrderStatus[] = [OrderStatus.PENDING, OrderStatus.CONFIRMED];

    if (!allowedForUser.includes(targetStatus) || !allowedFromStatuses.includes(order.status)) {
      throw new ApiError(
        httpStatus.FORBIDDEN,
        'Forbidden: Only ADMIN can perform this status transition.',
      );
    }
  }

  validateTransition(order.status, targetStatus);

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: { status: targetStatus },
    include: { items: true },
  });

  return updated;
};

/**
 * Payment-service stub / extension point.
 * Simulates payment processing and transitions order through the state machine:
 * PENDING -> CONFIRMED -> PAID  (two-step if order is PENDING, one-step if already CONFIRMED).
 */
export const payOrder = async (
  orderId: string,
  userId: string,
  userRole: string,
  input: PayOrderInput,
): Promise<Order> => {
  const order = await getOrderById(orderId, userId, userRole);

  if (order.status !== OrderStatus.PENDING && order.status !== OrderStatus.CONFIRMED) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Cannot pay for order with status '${order.status}'. Order must be PENDING or CONFIRMED.`,
    );
  }

  logger.info(
    { orderId, amount: order.totalAmount.toString(), paymentMethod: input.paymentMethod },
    'Processing payment',
  );

  // State machine: if PENDING, advance to CONFIRMED first, then PAID.
  // If already CONFIRMED, advance directly to PAID.
  let currentStatus = order.status;

  if (currentStatus === OrderStatus.PENDING) {
    validateTransition(currentStatus, OrderStatus.CONFIRMED);
    await prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.CONFIRMED },
    });
    currentStatus = OrderStatus.CONFIRMED;
  }

  validateTransition(currentStatus, OrderStatus.PAID);
  const updated = await prisma.order.update({
    where: { id: orderId },
    data: { status: OrderStatus.PAID },
    include: { items: true },
  });

  logger.info({ orderId }, 'Payment captured successfully');
  return updated;
};
