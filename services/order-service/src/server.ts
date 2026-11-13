import { createLogger, initMetrics, operationsServer } from '@ecommerce/observability';
import { setGrpcLogger, registerGracefulShutdown } from '@ecommerce/grpc-kit';
import config from './config';
import prisma from './utils/prismaClient';
import { startGrpcServer } from './grpc/orderServer';
import { connectKafkaProducer, disconnectKafkaProducer } from './events/kafka';
import { startOutboxWorker, stopOutboxWorker } from './events/outbox';

const logger = createLogger({ serviceName: 'order-service' });
setGrpcLogger(logger);
initMetrics('order-service');

const start = async () => {
  const grpcServer = await startGrpcServer();
  const server = operationsServer(() => prisma.$queryRaw`SELECT 1`);
  server.listen(config.PORT);
  void connectKafkaProducer();
  startOutboxWorker();
  registerGracefulShutdown({
    serviceName: 'order-service',
    httpServer: server,
    grpcServer,
    logger,
    onShutdown: async () => {
      await stopOutboxWorker();
      await disconnectKafkaProducer();
      await prisma.$disconnect();
    },
  });
};

void start().catch((err: unknown) => {
  logger.fatal({ err }, 'Startup failed');
  process.exit(1);
});
