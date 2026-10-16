import { Kafka, type Consumer, type EachMessagePayload, type Producer } from 'kafkajs';
import {
  ORDER_CREATED_DLQ_TOPIC,
  ORDER_CREATED_TOPIC,
  orderCreatedEventSchema,
  createLogger,
} from '@ecommerce/common';
import config from '../config';
import prisma from '../utils/prismaClient';
import * as productService from '../services/productService';

const logger = createLogger({ serviceName: 'product-service' });

const kafka = new Kafka({
  clientId: config.KAFKA_CLIENT_ID,
  brokers: [config.KAFKA_BROKER],
});

let consumer: Consumer | null = null;
let dlqProducer: Producer | null = null;

const getDlqProducer = async (): Promise<Producer> => {
  if (!dlqProducer) {
    dlqProducer = kafka.producer();
    await dlqProducer.connect();
  }
  return dlqProducer;
};

const sendToDlq = async (
  rawMessage: string,
  errorReason: string,
  eventId?: string,
): Promise<void> => {
  try {
    const producer = await getDlqProducer();
    await producer.send({
      topic: ORDER_CREATED_DLQ_TOPIC,
      messages: [
        {
          key: eventId ?? 'unknown',
          value: JSON.stringify({
            originalMessage: rawMessage,
            error: errorReason,
            failedAt: new Date().toISOString(),
          }),
        },
      ],
    });
    logger.warn({ eventId, topic: ORDER_CREATED_DLQ_TOPIC }, 'Sent poison-pill message to DLQ');
  } catch (dlqErr) {
    logger.error({ dlqErr }, 'Failed to forward to DLQ');
  }
};

/** Exponential backoff retry: retries up to `maxAttempts` before giving up. */
const withRetry = async <T>(
  fn: () => Promise<T>,
  maxAttempts: number,
  baseDelayMs: number,
): Promise<T> => {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts) {
        const delay = baseDelayMs * Math.pow(2, attempt - 1);
        logger.warn({ attempt, maxAttempts, delay }, 'Retrying after transient error');
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw lastError;
};

export const connectKafkaConsumer = async (): Promise<void> => {
  try {
    consumer = kafka.consumer({ groupId: config.KAFKA_GROUP_ID });
    await consumer.connect();

    await consumer.subscribe({
      topic: ORDER_CREATED_TOPIC,
      fromBeginning: false,
    });

    logger.info({ topic: ORDER_CREATED_TOPIC }, 'Product Service Kafka Consumer connected');

    await consumer.run({
      eachMessage: async ({ topic, partition, message }: EachMessagePayload) => {
        const raw = message.value?.toString();
        if (!raw) return;

        // 1. Validate Schema
        let parsedJson: unknown;
        try {
          parsedJson = JSON.parse(raw);
        } catch {
          await sendToDlq(raw, 'Malformed JSON payload');
          return;
        }

        const parseResult = orderCreatedEventSchema.safeParse(parsedJson);
        if (!parseResult.success) {
          await sendToDlq(raw, `Schema validation failure: ${parseResult.error.message}`);
          return;
        }

        const event = parseResult.data;
        logger.info(
          { topic, partition, eventId: event.eventId, orderId: event.orderId },
          'Kafka event received',
        );

        // 2. Process with retries; DLQ only after all retries exhausted
        try {
          await withRetry(
            async () => {
              // Single DB transaction: idempotency check + all stock decrements + processedEvent
              await prisma.$transaction(async (tx) => {
                // 2a. Idempotency Check — inside transaction so concurrent deliveries are safe
                const alreadyProcessed = await tx.processedEvent.findUnique({
                  where: { eventId: event.eventId },
                });

                if (alreadyProcessed) {
                  logger.info(
                    { eventId: event.eventId },
                    'Event already processed (idempotent), skipping',
                  );
                  return;
                }

                // 2b. Atomic stock decrements for every item — all-or-nothing
                for (const item of event.items) {
                  await productService.decrementProductStockTx(tx, item.productId, item.quantity);
                }

                // 2c. Mark event processed — inside the same transaction
                await tx.processedEvent.create({
                  data: {
                    eventId: event.eventId,
                    eventType: event.eventType,
                  },
                });
              });
            },
            3, // max 3 attempts
            200, // base delay 200 ms → 200, 400, 800 ms
          );

          logger.info(
            { orderId: event.orderId, eventId: event.eventId },
            'Kafka event processed successfully',
          );
        } catch (procErr) {
          const errMsg = procErr instanceof Error ? procErr.message : String(procErr);
          logger.error({ eventId: event.eventId, errMsg }, 'Processing failed after retries');
          await sendToDlq(raw, errMsg, event.eventId);
        }
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ msg }, 'Kafka Consumer connection failed, retrying in 5s...');
    setTimeout(() => {
      void connectKafkaConsumer();
    }, 5000);
  }
};

export const disconnectKafkaConsumer = async (): Promise<void> => {
  if (consumer) {
    await consumer.disconnect();
    logger.info('Product Service Kafka Consumer disconnected');
  }
  if (dlqProducer) {
    await dlqProducer.disconnect();
    logger.info('Product Service DLQ Producer disconnected');
  }
};
