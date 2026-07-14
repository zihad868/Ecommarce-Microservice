const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const PROTO_PATH = path.join(__dirname, '../../../protos/order.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});
const orderProto = grpc.loadPackageDefinition(packageDefinition).order;

/**
 * GetOrder RPC — fetch a single order by ID
 */
const getOrder = async (call, callback) => {
  try {
    const { orderId } = call.request;
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      return callback(null, {
        success: false, id: '', userId: '', totalAmount: 0, status: '', error: 'Order not found',
      });
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
    console.error('[gRPC] getOrder error:', error.message);
    callback(null, {
      success: false, id: '', userId: '', totalAmount: 0, status: '', error: 'Internal server error',
    });
  }
};

/**
 * GetOrdersByUser RPC — fetch all orders for a user (for notification service etc.)
 */
const getOrdersByUser = async (call, callback) => {
  try {
    const { userId } = call.request;
    const orders = await prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50, // limit for gRPC response size
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
    console.error('[gRPC] getOrdersByUser error:', error.message);
    callback(null, { success: false, orders: [], error: 'Internal server error' });
  }
};

const startGrpcServer = () => {
  const server = new grpc.Server({
    'grpc.max_receive_message_length': 1024 * 1024 * 10,
    'grpc.max_send_message_length': 1024 * 1024 * 10,
  });
  server.addService(orderProto.OrderService.service, {
    GetOrder: getOrder,
    GetOrdersByUser: getOrdersByUser,
  });
  const port = process.env.GRPC_PORT || 50053;
  server.bindAsync(`0.0.0.0:${port}`, grpc.ServerCredentials.createInsecure(), (err, boundPort) => {
    if (err) {
      console.error('Failed to bind Order gRPC server:', err);
      return;
    }
    console.log(`Order gRPC Server running on port ${boundPort}`);
  });
};

module.exports = { startGrpcServer };
