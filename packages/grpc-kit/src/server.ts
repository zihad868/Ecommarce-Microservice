import { Server } from '@grpc/grpc-js';
import { getServerCredentials } from './grpc/credentials';
import type {
  ServiceDefinition,
  UntypedServiceImplementation,
  ServerUnaryCall,
  sendUnaryData,
} from '@grpc/grpc-js';
import { isServerError, toGrpcError } from '@ecommerce/errors';
import { createLogger } from '@ecommerce/observability';
import type { Logger } from 'pino';

let logger: Logger = createLogger({ serviceName: 'grpc-service' });
export const setGrpcLogger = (serviceLogger: Logger): void => {
  logger = serviceLogger;
};

/** Await binding before declaring the process ready; propagate startup failures. */
export async function bindGrpc(
  definition: ServiceDefinition,
  handlers: UntypedServiceImplementation,
  address: string,
  credentials = getServerCredentials(),
  additionalServices: {
    definition: ServiceDefinition;
    handlers: UntypedServiceImplementation;
  }[] = [],
): Promise<Server> {
  const server = new Server();
  server.addService(definition, handlers);
  for (const service of additionalServices) server.addService(service.definition, service.handlers);
  await new Promise<void>((resolve, reject) => {
    server.bindAsync(address, credentials, (error) => (error ? reject(error) : resolve()));
  });
  return server;
}

export function unary<Request, Response>(
  handler: (request: Request, call: ServerUnaryCall<Request, Response>) => Promise<Response>,
): (call: ServerUnaryCall<Request, Response>, callback: sendUnaryData<Response>) => void {
  return (call, callback) => {
    void (async () => {
      let response: Response;
      try {
        response = await handler(call.request, call);
      } catch (error) {
        const context = {
          rpc: call.getPath(),
          correlationId: call.metadata.get('x-correlation-id')[0],
        };
        if (isServerError(error)) logger.error({ err: error, ...context }, 'Unhandled RPC error');
        else logger.debug({ err: error, ...context }, 'RPC rejected');
        callback(toGrpcError(error));
        return;
      }
      callback(null, response);
    })();
  };
}
