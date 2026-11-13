import { getRedisClient } from './utils/redisClient';
import { createLogger, initMetrics, operationsServer } from '@ecommerce/observability';
import { setGrpcLogger, registerGracefulShutdown } from '@ecommerce/grpc-kit';
import config from './config';
import prisma from './utils/prismaClient';
import { startGrpcServer } from './grpc/authServer';

const logger = createLogger({ serviceName: 'identity-service' });
setGrpcLogger(logger);
initMetrics('identity-service');

const start = async () => {
  const grpcServer = await startGrpcServer();
  const server = operationsServer(() => prisma.$queryRaw`SELECT 1`);
  server.listen(config.PORT);

  registerGracefulShutdown({
    serviceName: 'identity-service',
    httpServer: server,
    grpcServer,
    logger,
    onShutdown: async () => {
      getRedisClient().disconnect();
      await prisma.$disconnect();
    },
  });
};

void start().catch((err: unknown) => {
  logger.fatal({ err }, 'Startup failed');
  process.exit(1);
});
