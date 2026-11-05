import { normalizeError, ValidationError } from '@ecommerce/errors';
import { type Consumer, type Producer } from 'kafkajs';
import {
  decodeOrderCreated,
  decodeStockReleaseRequested,
  encodeOrderCreated,
  encodeStockReleased,
  encodeStockReleaseRequested,
  encodeStockReservationFailed,
  runConsumer,
  TOPICS,
  type OrderCreatedEvent,
  type StockReleaseRequestedEvent,
  createKafka,
} from '@ecommerce/messaging-kit';
import { createLogger } from '@ecommerce/observability';
import config from '../config';
import prisma from '../utils/prismaClient';
import * as productService from '../services/productService';
import { releaseStock } from '../services/stockService';

const logger = createLogger({ serviceName: 'catalog-service' });

const kafka = createKafka(config.KAFKA_CLIENT_ID, config.KAFKA_BROKER.split(','));

type CatalogInboundEvent =
  | { kind: 'orderCreated'; data: OrderCreatedEvent }
  | { kind: 'stockReleaseRequested'; data: StockReleaseRequestedEvent };

let consumer: Consumer | null = null;
let dlqProducer: Producer | null = null;
let producerConnection: Promise<Producer> | undefined;
let stopping = false;
let retryTimer: NodeJS.Timeout | undefined;

export const getKafkaProducer = (): Producer | null => dlqProducer;

const getDlqProducer = async (): Promise<Producer> => {
  if (dlqProducer) return dlqProducer;
  producerConnection ??= (async () => {
    const connected = kafka.producer({ idempotent: true });
    await connected.connect();
    dlqProducer = connected;
    return connected;
  })();
  try {
    return await producerConnection;
  } finally {
    producerConnection = undefined;
  }
};

export const publishEvent = async (topic: string, key: string, data: unknown): Promise<void> => {
  const producer = await getDlqProducer();
  let value: Buffer;
  let contentType = 'application/x-protobuf';

  if (topic === TOPICS.stockReservationFailed) {
    value = encodeStockReservationFailed(data);
  } else if (topic === TOPICS.stockReleased) {
    value = encodeStockReleased(data);
  } else if (topic === TOPICS.orderCreated) {
    value = encodeOrderCreated(data);
  } else if (topic === TOPICS.stockReleaseRequested) {
    value = encodeStockReleaseRequested(data);
  } else {
    value = Buffer.from(JSON.stringify(data));
    contentType = 'application/json';
  }

  await producer.send({
    topic,
    messages: [
      {
        key,
        value,
        headers: {
          'content-type': contentType,
        },
      },
    ],
  });
};

export const connectKafkaConsumer = async (): Promise<void> => {
  try {
    const producer = await getDlqProducer();
    consumer = kafka.consumer({ groupId: config.KAFKA_GROUP_ID });
    await consumer.connect();

    await consumer.subscribe({
      topics: [TOPICS.orderCreated, TOPICS.stockReleaseRequested],
      fromBeginning: true,
    });

    logger.info(
      { topics: [TOPICS.orderCreated, TOPICS.stockReleaseRequested] },
      'Product Service Kafka Consumer connected',
    );

    await runConsumer<CatalogInboundEvent>({
      consumer,
      isRetryable: (error) => {
        const known = normalizeError(error);
        return !known || known.statusCode >= 500;
      },
      dlq: producer,
      topics: [TOPICS.orderCreated, TOPICS.stockReleaseRequested],
      decode: (topic, bytes) => {
        if (topic === TOPICS.orderCreated) {
          return { kind: 'orderCreated', data: decodeOrderCreated(bytes) };
        }
        if (topic === TOPICS.stockReleaseRequested) {
          return { kind: 'stockReleaseRequested', data: decodeStockReleaseRequested(bytes) };
        }
        throw new Error(`Unknown topic: ${topic}`);
      },
      handle: async (event) => {
        if (event.kind === 'stockReleaseRequested') {
          if (!event.data.orderId) throw new ValidationError('Missing order ID');
          await releaseStock(event.data.orderId);
          return;
        }

        const orderCreated = event.data;
        await prisma.$transaction(async (tx) => {
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${orderCreated.orderId}, 1))`;
          const alreadyProcessed = await tx.processedEvent.findUnique({
            where: { eventId: orderCreated.eventId },
          });

          if (alreadyProcessed) {
            logger.info(
              { eventId: orderCreated.eventId },
              'Event already processed (idempotent), skipping',
            );
            return;
          }

          const reservation = await tx.stockReservation.findUnique({
            where: { orderId: orderCreated.orderId },
          });
          if (!reservation || reservation.status === 'RELEASED') {
            await tx.outboxEvent.create({
              data: {
                aggregateId: orderCreated.orderId,
                eventType: 'StockReservationFailed',
                payload: { eventId: orderCreated.eventId, orderId: orderCreated.orderId },
              },
            });
          }

          await tx.processedEvent.create({
            data: {
              eventId: orderCreated.eventId,
              eventType: orderCreated.eventType,
            },
          });
        });

        await Promise.all(
          orderCreated.items.map((item) => productService.invalidateProductCache(item.productId)),
        );

        logger.info(
          { orderId: orderCreated.orderId, eventId: orderCreated.eventId },
          'Kafka event processed successfully',
        );
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ msg }, 'Kafka Consumer connection failed, retrying in 5s...');
    await consumer?.disconnect().catch(() => undefined);
    if (!stopping)
      retryTimer = setTimeout(() => {
        void connectKafkaConsumer();
      }, 5000);
  }
};

export const disconnectKafkaConsumer = async (): Promise<void> => {
  stopping = true;
  if (retryTimer) clearTimeout(retryTimer);
  if (consumer) {
    await consumer.disconnect();
    logger.info('Product Service Kafka Consumer disconnected');
  }
  if (dlqProducer) {
    await dlqProducer.disconnect();
    logger.info('Product Service DLQ Producer disconnected');
  }
  dlqProducer = null;
};
