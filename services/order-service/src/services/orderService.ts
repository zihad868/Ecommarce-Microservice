import { createHash } from 'node:crypto';
import { v4 as uuidv4 } from 'uuid';
import {
  ValidationError,
  ForbiddenError,
  NotFoundError,
  IdempotencyConflictError,
  ConcurrentModificationError,
  DependencyUnavailableError,
} from '@ecommerce/errors';
import { type OrderCreatedEvent, type OrderItemEvent } from '@ecommerce/messaging-kit';
import prisma, { OrderStatus, Prisma, type Order } from '../utils/prismaClient';
import { getProductDetails, reserveStock, releaseStockRemote } from '../grpc/grpcClients';
import { validateTransition } from './orderStateMachine';
import type { CreateOrderItemInput, UpdateOrderStatusInput } from '../validators/orderValidators';
import { createLogger } from '@ecommerce/observability';
const logger = createLogger({ serviceName: 'order-service' });

export const createOrder = async (
  userId: string,
  items: CreateOrderItemInput[],
  idempotencyKey?: string,
): Promise<Order> => {
  const requestHash = createHash('sha256')
    .update(JSON.stringify([...items].sort((a, b) => a.productId.localeCompare(b.productId))))
    .digest('hex');
  const replay = (record: { requestHash: string; response: Prisma.JsonValue }): Order => {
    if (record.requestHash !== requestHash) throw new IdempotencyConflictError();
    return mapOrderResponse(record.response as unknown as Order);
  };
  // 1. Idempotency Key check — scoped to userId to prevent cross-user leakage
  if (idempotencyKey) {
    const existing = await prisma.idempotencyRecord.findUnique({
      where: { userId_key: { userId, key: idempotencyKey } },
    });
    if (existing) {
      logger.info({ idempotencyKey, userId }, 'Returning cached order for idempotency key');
      return replay(existing);
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
      const code =
        typeof grpcErr === 'object' && grpcErr !== null && 'code' in grpcErr
          ? grpcErr.code
          : undefined;
      if (code === 5) {
        throw new ValidationError(`Product ${item.productId} not found`);
      }
      const msg = grpcErr instanceof Error ? grpcErr.message : String(grpcErr);
      logger.error(
        { err: grpcErr, msg, productId: item.productId },
        'Product service request failed',
      );
      throw new DependencyUnavailableError();
    }

    const rawPrice =
      productResponse.price && typeof productResponse.price === 'object'
        ? (productResponse.price.amount ??
          String(Number(productResponse.price.amount_minor ?? 0) / 100))
        : String(productResponse.price ?? 0);
    const itemPrice = new Prisma.Decimal(rawPrice);
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
  const orderId = idempotencyKey
    ? createHash('sha256')
        .update(JSON.stringify([userId, idempotencyKey]))
        .digest('hex')
    : uuidv4();

  await reserveStock(orderId, items);

  try {
    const createdOrder = await prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${orderId}, 0))`;
        if (idempotencyKey) {
          const existing = await tx.idempotencyRecord.findUnique({
            where: { userId_key: { userId, key: idempotencyKey } },
          });
          if (existing) return replay(existing);
        }
        const order = await tx.order.create({
          data: {
            id: orderId,
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
              requestHash,
              statusCode: 201,
              response: JSON.parse(
                JSON.stringify(mapOrderResponse(order)),
              ) as Prisma.InputJsonValue,
            },
          });
        }

        return mapOrderResponse(order);
      },
      { timeout: 10_000, maxWait: 10_000 },
    );

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
      if (existing) return replay(existing);
    }
    // The order was not created: give the stock back now instead of waiting 15 minutes.
    const exists = await prisma.order.findUnique({ where: { id: orderId }, select: { id: true } });
    if (!exists) {
      await releaseStockRemote(orderId).catch((e) =>
        logger.error({ e, orderId }, 'release failed'),
      );
    }
    throw err;
  }
};

function encodeCursor(order: { createdAt: Date; id: string }): string {
  return Buffer.from(
    JSON.stringify({ createdAt: order.createdAt.toISOString(), id: order.id }),
  ).toString('base64');
}

function decodeCursor(cursorStr: string): { createdAt: Date; id: string } | null {
  try {
    const raw = Buffer.from(cursorStr, 'base64').toString('utf8');
    const parsed = JSON.parse(raw) as { createdAt: string; id: string };
    if (!parsed.createdAt || !parsed.id) return null;
    return { createdAt: new Date(parsed.createdAt), id: parsed.id };
  } catch {
    return null;
  }
}

export const getOrders = async (
  userId: string,
  userRole: string,
  query: { limit?: number; cursor?: string; status?: OrderStatus; includeTotal?: boolean },
) => {
  const limit = Math.min(Math.max(query.limit ?? 20, 1), 100);
  const base: Prisma.OrderWhereInput = {};
  if (userRole !== 'ADMIN') {
    base.userId = userId;
  }
  if (query.status) {
    base.status = query.status;
  }

  const cursor = query.cursor ? decodeCursor(query.cursor) : null;

  const rows = await prisma.order.findMany({
    where: {
      ...base,
      ...(cursor && {
        OR: [
          { createdAt: { lt: cursor.createdAt } },
          { createdAt: cursor.createdAt, id: { lt: cursor.id } },
        ],
      }),
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: limit + 1,
    include: { items: true },
  });

  const hasMore = rows.length > limit;
  const page = rows.slice(0, limit);
  const lastItem = page[page.length - 1];
  const nextCursor = hasMore && lastItem ? encodeCursor(lastItem) : null;

  let total: number | undefined;
  if (query.includeTotal) {
    total = await prisma.order.count({ where: base });
  }

  return {
    orders: page,
    nextCursor,
    total,
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
    throw new NotFoundError('Order');
  }

  if (userRole !== 'ADMIN' && order.userId !== userId) {
    throw new ForbiddenError('Forbidden: You are not authorized to view this order');
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
      throw new ForbiddenError('Forbidden: Only ADMIN can perform this status transition.');
    }
  }

  validateTransition(order.status, targetStatus);

  const updated = await prisma.$transaction(async (tx) => {
    const { count } = await tx.order.updateMany({
      where: { id: orderId, status: order.status },
      data: { status: targetStatus },
    });
    if (count === 0) throw new ConcurrentModificationError();
    if (targetStatus === OrderStatus.CANCELLED) await enqueueStockRelease(tx, orderId);
    return tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true } });
  });

  return updated;
};

// Both the initial response and JSON replay pass through this hydration boundary.
export const mapOrderResponse = (order: Order): Order => ({
  ...order,
  totalAmount: new Prisma.Decimal(order.totalAmount),
  createdAt: new Date(order.createdAt),
  updatedAt: new Date(order.updatedAt),
  ...('items' in order && Array.isArray(order.items)
    ? {
        items: order.items.map((item: { price: Prisma.Decimal }) => ({
          ...item,
          price: new Prisma.Decimal(item.price),
        })),
      }
    : {}),
});
const enqueueStockRelease = (tx: Prisma.TransactionClient, orderId: string) =>
  tx.outboxEvent.create({
    data: {
      aggregateId: orderId,
      eventType: 'StockReleaseRequested',
      payload: { eventId: uuidv4(), orderId },
    },
  });
export const reconcileReservation = (orderId: string) =>
  prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${orderId}, 0))`;
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order) return { release: true, commit: false };
    if (order.status === 'PENDING' && order.createdAt.getTime() <= Date.now() - 15 * 60_000) {
      const { count } = await tx.order.updateMany({
        where: { id: orderId, status: 'PENDING' },
        data: { status: 'CANCELLED' },
      });
      if (count) {
        await enqueueStockRelease(tx, orderId);
        return { release: true, commit: false };
      }
      return { release: false, commit: false };
    }
    return {
      release: order.status === 'CANCELLED',
      commit: ['PAID', 'SHIPPED', 'COMPLETED'].includes(order.status),
    };
  });
export const cancelOrderForStockFailure = (orderId: string) =>
  prisma.$transaction(async (tx) => {
    const { count } = await tx.order.updateMany({
      where: { id: orderId, status: { in: ['PENDING', 'CONFIRMED'] } },
      data: { status: 'CANCELLED' },
    });
    if (count) await enqueueStockRelease(tx, orderId);
  });
