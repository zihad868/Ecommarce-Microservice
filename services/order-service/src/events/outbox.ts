import { createOutboxWorker, EVENT_TOPIC_MAP } from '@ecommerce/messaging-kit';
import { createLogger, initMetrics } from '@ecommerce/observability';
import prisma from '../utils/prismaClient';
import { publishEvent } from './kafka';

const logger = createLogger({ serviceName: 'order-service' });
const { outboxRows } = initMetrics('order-service');

export const outbox = createOutboxWorker({
  db: prisma,
  publish: publishEvent,
  topicFor: (eventType: string) => EVENT_TOPIC_MAP[eventType] ?? eventType,
  logger,
  onMetricsUpdate: ({ pending, failed }) => {
    outboxRows.set({ status: 'PENDING' }, pending);
    outboxRows.set({ status: 'FAILED' }, failed);
  },
});

export const processOutboxEvents = (batchSize?: number) => outbox.processOnce(batchSize);

export const maintainOutbox = () => outbox.maintain();

export const startOutboxWorker = (intervalMs?: number) => outbox.start(intervalMs);

export const stopOutboxWorker = () => outbox.stop();
