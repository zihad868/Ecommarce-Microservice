import { ORDER_CREATED_TOPIC } from '@ecommerce/common';
import prisma from '../utils/prismaClient';
import { getKafkaProducer, publishEvent } from './kafka';

let isRunning = false;
let timerId: NodeJS.Timeout | null = null;

export const processOutboxEvents = async (): Promise<number> => {
  const producer = getKafkaProducer();
  if (!producer) {
    // Producer not connected yet, wait for next tick
    return 0;
  }

  // Fetch oldest unpublished events
  const pendingEvents = await prisma.outboxEvent.findMany({
    where: { published: false },
    orderBy: { createdAt: 'asc' },
    take: 20,
  });

  if (pendingEvents.length === 0) {
    return 0;
  }

  let processedCount = 0;

  for (const event of pendingEvents) {
    try {
      const topic = event.eventType === 'OrderCreated' ? ORDER_CREATED_TOPIC : event.eventType;

      await publishEvent(topic, event.aggregateId, event.payload);

      await prisma.outboxEvent.update({
        where: { id: event.id },
        data: {
          published: true,
          updatedAt: new Date(),
        },
      });

      processedCount++;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error(`[Outbox Worker] Failed to publish event ${event.id}:`, errMsg);

      await prisma.outboxEvent.update({
        where: { id: event.id },
        data: {
          retryCount: { increment: 1 },
          updatedAt: new Date(),
        },
      });

      // Break on Kafka connection failure to prevent thrashing
      break;
    }
  }

  return processedCount;
};

export const startOutboxWorker = (intervalMs = 1000): void => {
  if (isRunning) return;
  isRunning = true;

  const tick = async () => {
    try {
      await processOutboxEvents();
    } catch (err) {
      console.error('[Outbox Worker] Error in outbox tick:', err);
    } finally {
      if (isRunning) {
        timerId = setTimeout(() => {
          void tick();
        }, intervalMs);
      }
    }
  };

  void tick();
  console.log(`[Outbox Worker] Started polling every ${String(intervalMs)}ms`);
};

export const stopOutboxWorker = (): void => {
  isRunning = false;
  if (timerId) {
    clearTimeout(timerId);
    timerId = null;
  }
  console.log('[Outbox Worker] Stopped');
};
