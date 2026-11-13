import { createServer } from 'node:http';
import { registerGracefulShutdown } from './shutdown/gracefulShutdown';

/** Operations listener for services whose business handlers are not yet implemented. */
export const startFoundation = (options: { serviceName: string; port: number }): void => {
  const port = Number(process.env.PORT ?? options.port);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid PORT for ${options.serviceName}`);
  }

  const server = createServer((request, response) => {
    response.setHeader('Content-Type', 'application/json');

    if (request.url === '/health/live') {
      response.writeHead(200).end(JSON.stringify({ service: options.serviceName, status: 'UP' }));
    } else if (request.url === '/health/ready') {
      response
        .writeHead(503)
        .end(JSON.stringify({ service: options.serviceName, status: 'NOT_IMPLEMENTED' }));
    } else {
      response.writeHead(404).end(JSON.stringify({ error: 'Route not found' }));
    }
  });
  server.listen(port);
  registerGracefulShutdown({ serviceName: options.serviceName, httpServer: server });
};
