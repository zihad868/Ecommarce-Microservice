import path from 'node:path';
import fs from 'node:fs';
import * as loader from '@grpc/proto-loader';
import * as grpc from '@grpc/grpc-js';
import type { ProtoGrpcType as AuthProto } from './generated/auth';
import type { ProtoGrpcType as ProductProto } from './generated/product';
import type { ProtoGrpcType as OrderProto } from './generated/order';
import type { ProtoGrpcType as AuthV2Proto } from './generated/auth_v2';
import type { ProtoGrpcType as OrderV2Proto } from './generated/order_v2';

export type { AuthServiceHandlers as AuthV2ServiceHandlers } from './generated/auth/v2/AuthService';
export type { OrderServiceHandlers as OrderV2ServiceHandlers } from './generated/order/v2/OrderService';
export type { OrderStatus as OrderV2Status } from './generated/order/v2/OrderStatus';

export const loadAuthV2 = (): AuthV2Proto =>
  loadProto('auth/v2/auth_v2.proto') as unknown as AuthV2Proto;

export const loadOrderV2 = (): OrderV2Proto =>
  loadProto('order/v2/order_v2.proto') as unknown as OrderV2Proto;

export type { AuthServiceClient, AuthServiceHandlers } from './generated/auth/v1/AuthService';
export type {
  ProductServiceClient,
  ProductServiceHandlers,
} from './generated/product/v1/ProductService';
export type { OrderServiceClient, OrderServiceHandlers } from './generated/order/v1/OrderService';

export const loadAuth = (): AuthProto => loadProto('auth/v1/auth.proto') as unknown as AuthProto;

export const loadProduct = (): ProductProto =>
  loadProto('product/v1/product.proto') as unknown as ProductProto;

export const loadOrder = (): OrderProto =>
  loadProto('order/v1/order.proto') as unknown as OrderProto;

/** Works from src or dist and does not depend on the process working directory. */
export const contractsRoot = path.resolve(__dirname, '../../../contracts');

export const contractPath = (file: string, module = 'proto'): string => {
  const base = path.resolve(contractsRoot, module);
  const resolved = path.resolve(base, file);

  if (!resolved.startsWith(base + path.sep) || !fs.existsSync(resolved)) {
    throw new Error(`Unknown contract: ${module}/${file}`);
  }

  return resolved;
};

export const loadProto = (file: string, directory?: string): grpc.GrpcObject => {
  const filename = directory ? path.resolve(directory, file) : contractPath(file);

  return grpc.loadPackageDefinition(
    loader.loadSync(filename, {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true,
      includeDirs: [path.join(contractsRoot, 'proto'), path.join(contractsRoot, 'events')],
    }),
  );
};

export const eventCodec = (
  file: string,
  message: string,
): loader.MessageTypeDefinition<object, object> => {
  const definitions = loader.loadSync(contractPath(file, 'events'), {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    includeDirs: [path.join(contractsRoot, 'proto'), path.join(contractsRoot, 'events')],
  });
  const definition = definitions[message];

  if (!definition || !('serialize' in definition) || !('deserialize' in definition)) {
    throw new Error(`Unknown protobuf event message: ${message}`);
  }

  return definition as loader.MessageTypeDefinition<object, object>;
};
