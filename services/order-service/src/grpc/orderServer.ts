import { loadOrder, loadOrderV2 } from '@ecommerce/proto-gen';
import { bindGrpc } from '@ecommerce/grpc-kit';
import config from '../config';
import { orderHandlers } from './handlers/orders';
import { orderV2Handlers } from './handlers/ordersV2';
export const startGrpcServer = () =>
  bindGrpc(
    loadOrder().order.v1.OrderService.service,
    orderHandlers,
    `0.0.0.0:${config.GRPC_PORT}`,
    undefined,
    [{ definition: loadOrderV2().order.v2.OrderService.service, handlers: orderV2Handlers }],
  );
