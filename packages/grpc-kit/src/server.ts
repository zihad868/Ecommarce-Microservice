import { Server } from '@grpc/grpc-js';
import { getServerCredentials } from './grpc/credentials';
import type {
  ServiceDefinition,
  UntypedServiceImplementation,
  ServerUnaryCall,
  sendUnaryData,
} from '@grpc/grpc-js';
import { toGrpcError } from '@ecommerce/errors';

/** Await binding before declaring the process ready; propagate startup failures. */
export async function bindGrpc(
  definition: ServiceDefinition,
  handlers: UntypedServiceImplementation,
  address: string,
  credentials = getServerCredentials(),
): Promise<Server> {
  const server = new Server();
  server.addService(definition, handlers);
  await new Promise<void>((resolve, reject) => {
    server.bindAsync(address, credentials, (error) => (error ? reject(error) : resolve()));
  });
  return server;
}

export function unary<Request, Response>(
  handler: (request: Request, call: ServerUnaryCall<Request, Response>) => Promise<Response>,
): (call: ServerUnaryCall<Request, Response>, callback: sendUnaryData<Response>) => void {
  return (call, callback) => {
    void handler(call.request, call).then(
      (response) => callback(null, response),
      (error: unknown) => callback(toGrpcError(error)),
    );
  };
}
