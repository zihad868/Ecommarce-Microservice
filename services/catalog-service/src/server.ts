import { getRedisClient } from './utils/redisClient';
import { createLogger, initMetrics, operationsServer } from '@ecommerce/observability';
import { setGrpcLogger, registerGracefulShutdown } from '@ecommerce/grpc-kit';
import config from './config';
import prisma from './utils/prismaClient';
import { startGrpcServer } from './grpc/productServer';
import { connectKafkaConsumer, disconnectKafkaConsumer } from './events/kafka';
import { startOutboxWorker, stopOutboxWorker } from './events/outbox';
import { startReservationWorker, stopReservationWorker } from './events/reservationWorker';

const logger = createLogger({ serviceName: 'catalog-service' });
setGrpcLogger(logger);
initMetrics('catalog-service');
const start = async () => {
  const grpcServer = await startGrpcServer();
  const server = operationsServer(() => prisma.$queryRaw`SELECT 1`);
  server.listen(config.PORT);
  void connectKafkaConsumer();
  startOutboxWorker();
  startReservationWorker();
  registerGracefulShutdown({
    serviceName: 'catalog-service',
    httpServer: server,
    grpcServer,
    logger,
    onShutdown: async () => {
      await stopOutboxWorker();
      await stopReservationWorker();
      await disconnectKafkaConsumer();
      getRedisClient().disconnect();
      await prisma.$disconnect();
    },
  });
};
void start().catch((err: unknown) => {
  logger.fatal({ err }, 'Startup failed');
  process.exit(1);
});
