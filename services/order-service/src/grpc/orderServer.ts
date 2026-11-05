import { loadOrder } from '@ecommerce/proto-gen';
import { bindGrpc } from '@ecommerce/grpc-kit';
import config from '../config';
import { orderHandlers } from './handlers/orders';
export const startGrpcServer = () =>
  bindGrpc(loadOrder().order.v1.OrderService.service, orderHandlers, `0.0.0.0:${config.GRPC_PORT}`);
