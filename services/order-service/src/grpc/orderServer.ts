import type * as grpc from '@grpc/grpc-js';
import { loadOrder } from '@ecommerce/proto-gen';
import { bindGrpc } from '@ecommerce/grpc-kit';
import { toGrpcError } from '@ecommerce/errors';
import config from '../config';
import prisma, { type Order } from '../utils/prismaClient';

const orderProto = loadOrder();

interface OrderRequest {
  orderId: string;
}

interface OrderResponse {
  success: boolean;
  id: string;
  userId: string;
  totalAmount: number;
  status: string;
  error: string;
}

interface UserOrdersRequest {
  userId: string;
}

interface UserOrdersResponse {
  success: boolean;
  orders: OrderResponse[];
  error: string;
}

const getOrder = async (
  call: grpc.ServerUnaryCall<OrderRequest, OrderResponse>,
  callback: grpc.sendUnaryData<OrderResponse>,
): Promise<void> => {
  try {
    const { orderId } = call.request;
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      callback(null, {
        success: false,
        id: '',
        userId: '',
        totalAmount: 0,
        status: '',
        error: 'Order not found',
      });
      return;
    }

    callback(null, {
      success: true,
      id: order.id,
      userId: order.userId,
      totalAmount: Number(order.totalAmount),
      status: order.status,
      error: '',
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[gRPC] getOrder error:', errMsg);
    callback(toGrpcError(error));
  }
};

const getOrdersByUser = async (
  call: grpc.ServerUnaryCall<UserOrdersRequest, UserOrdersResponse>,
  callback: grpc.sendUnaryData<UserOrdersResponse>,
): Promise<void> => {
  try {
    const { userId } = call.request;
    const orders = await prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    callback(null, {
      success: true,
      orders: orders.map((o: Order) => ({
        success: true,
        id: o.id,
        userId: o.userId,
        totalAmount: Number(o.totalAmount),
        status: o.status,
        error: '',
      })),
      error: '',
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[gRPC] getOrdersByUser error:', errMsg);
    callback(toGrpcError(error));
  }
};

export const startGrpcServer = (): Promise<grpc.Server> => {
  return bindGrpc(
    orderProto.order.v1.OrderService.service,
    {
      GetOrder: (
        call: grpc.ServerUnaryCall<OrderRequest, OrderResponse>,
        callback: grpc.sendUnaryData<OrderResponse>,
      ) => {
        void getOrder(call, callback);
      },
      GetOrdersByUser: (
        call: grpc.ServerUnaryCall<UserOrdersRequest, UserOrdersResponse>,
        callback: grpc.sendUnaryData<UserOrdersResponse>,
      ) => {
        void getOrdersByUser(call, callback);
      },
    },
    `0.0.0.0:${config.GRPC_PORT}`,
  );
};
