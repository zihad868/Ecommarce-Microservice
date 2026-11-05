import path from 'node:path';
import fs from 'node:fs';
import * as loader from '@grpc/proto-loader';
import * as grpc from '@grpc/grpc-js';
import type { ProtoGrpcType as AuthProto } from './generated/auth';
import type { ProtoGrpcType as ProductProto } from './generated/product';
import type { ProtoGrpcType as OrderProto } from './generated/order';

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

export function contractPath(file: string, module = 'proto'): string {
  const base = path.resolve(contractsRoot, module);
  const resolved = path.resolve(base, file);
  if (!resolved.startsWith(base + path.sep) || !fs.existsSync(resolved)) {
    throw new Error(`Unknown contract: ${module}/${file}`);
  }
  return resolved;
}

export function loadProto(file: string, directory?: string): grpc.GrpcObject {
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
}

export function eventCodec(
  file: string,
  message: string,
): loader.MessageTypeDefinition<object, object> {
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
}
