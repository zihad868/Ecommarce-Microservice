import { loadProduct } from '@ecommerce/proto-gen';
import { bindGrpc } from '@ecommerce/grpc-kit';
import config from '../config';
import { productHandlers } from './handlers/products';
export const startGrpcServer = () =>
  bindGrpc(
    loadProduct().product.v1.ProductService.service,
    productHandlers,
    `0.0.0.0:${config.GRPC_PORT}`,
  );
