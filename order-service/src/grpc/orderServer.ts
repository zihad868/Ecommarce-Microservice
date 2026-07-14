import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PROTO_PATH = path.join(__dirname, '../../../protos/order.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const orderProto = grpc.loadPackageDefinition(packageDefinition) as any;

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
  callback: grpc.sendUnaryData<OrderResponse>
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
      totalAmount: order.totalAmount,
      status: order.status,
      error: '',
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[gRPC] getOrder error:', errMsg);
    callback(null, {
      success: false,
      id: '',
      userId: '',
      totalAmount: 0,
      status: '',
      error: 'Internal server error',
    });
  }
};

const getOrdersByUser = async (
  call: grpc.ServerUnaryCall<UserOrdersRequest, UserOrdersResponse>,
  callback: grpc.sendUnaryData<UserOrdersResponse>
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
      orders: orders.map((o) => ({
        success: true,
        id: o.id,
        userId: o.userId,
        totalAmount: o.totalAmount,
        status: o.status,
        error: '',
      })),
      error: '',
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[gRPC] getOrdersByUser error:', errMsg);
    callback(null, {
      success: false,
      orders: [],
      error: 'Internal server error',
    });
  }
};

export const startGrpcServer = (): void => {
  const server = new grpc.Server({
    'grpc.max_receive_message_length': 1024 * 1024 * 10,
    'grpc.max_send_message_length': 1024 * 1024 * 10,
  });

  server.addService(orderProto.order.OrderService.service, {
    GetOrder: getOrder,
    GetOrdersByUser: getOrdersByUser,
  });

  const port = process.env.GRPC_PORT || 50053;
  server.bindAsync(
    `0.0.0.0:${port}`,
    grpc.ServerCredentials.createInsecure(),
    (err, boundPort) => {
      if (err) {
        console.error('Failed to bind Order gRPC server:', err);
        return;
      }
      console.log(`Order gRPC Server running on port ${boundPort}`);
    }
  );
};
