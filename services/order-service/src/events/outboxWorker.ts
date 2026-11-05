import { ORDER_CREATED_TOPIC } from '@ecommerce/messaging-kit';
import { createLogger, initMetrics } from '@ecommerce/observability';
import prisma from '../utils/prismaClient';
import { getKafkaProducer, publishEvent } from './kafka';

const logger = createLogger({ serviceName: 'order-service' });
const MAX_RETRIES = 8;
interface OutboxRow {
  id: string;
  aggregateId: string;
  eventType: string;
  payload: unknown;
  retryCount: number;
}
export const processOutboxEvents = async (batchSize = 20): Promise<number> => {
  if (!getKafkaProducer()) return 0;
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 100)
    throw new RangeError('Invalid batch size');
  return prisma.$transaction(
    async (tx) => {
      const rows = await tx.$queryRaw<OutboxRow[]>`
      SELECT id, "aggregateId", "eventType", payload, "retryCount" FROM "OutboxEvent"
      WHERE status = 'PENDING' AND "nextAttemptAt" <= NOW()
      ORDER BY "createdAt", id LIMIT ${batchSize} FOR UPDATE SKIP LOCKED`;
      let published = 0;
      for (const row of rows) {
        try {
          await publishEvent(
            row.eventType === 'OrderCreated' ? ORDER_CREATED_TOPIC : row.eventType,
            row.aggregateId,
            row.payload,
          );
        } catch (err) {
          const retryCount = row.retryCount + 1;
          const lastError = err instanceof Error ? err.message : String(err);
          await tx.outboxEvent.update({
            where: { id: row.id },
            data: {
              retryCount,
              lastError,
              status: retryCount >= MAX_RETRIES ? 'FAILED' : 'PENDING',
              nextAttemptAt: new Date(Date.now() + Math.min(2 ** retryCount * 1000, 300_000)),
            },
          });
          logger.error({ eventId: row.id, retryCount, lastError }, 'Outbox publication failed');
          continue;
        }
        await tx.outboxEvent.update({
          where: { id: row.id },
          data: {
            status: 'PUBLISHED',
            publishedAt: new Date(),
          },
        });
        published++;
      }
      return published;
    },
    { timeout: 30_000 },
  );
};
export const maintainOutbox = async (): Promise<void> => {
  await prisma.outboxEvent.deleteMany({
    where: {
      status: 'PUBLISHED',
      publishedAt: { lt: new Date(Date.now() - 7 * 86_400_000) },
    },
  });
};
let running = false;
let timer: NodeJS.Timeout | undefined;
let inFlight: Promise<void> | undefined;
export const startOutboxWorker = (intervalMs = 1000): void => {
  if (running) return;
  running = true;
  const { outboxRows } = initMetrics('order-service');
  let nextMaintenance = 0;
  const tick = async () => {
    try {
      await processOutboxEvents();
      if (Date.now() >= nextMaintenance) {
        await maintainOutbox();
        for (const status of ['PENDING', 'FAILED'] as const) {
          outboxRows.set({ status }, await prisma.outboxEvent.count({ where: { status } }));
        }
        nextMaintenance = Date.now() + 60_000;
      }
    } catch (err) {
      logger.error({ err }, 'Outbox tick failed');
    } finally {
      if (running)
        timer = setTimeout(() => {
          inFlight = tick();
        }, intervalMs);
    }
  };
  inFlight = tick();
};
export const stopOutboxWorker = async (): Promise<void> => {
  running = false;
  if (timer) clearTimeout(timer);
  await inFlight;
};
