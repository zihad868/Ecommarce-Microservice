import { normalizeError, ValidationError } from '@ecommerce/errors';
import { type Producer, type Consumer, Partitioners } from 'kafkajs';
import {
  createKafka,
  encodeOrderCreated,
  encodeStockReleaseRequested,
  decodeStockReservationFailed,
  runConsumer,
  TOPICS,
} from '@ecommerce/messaging-kit';
import config from '../config';
import { createLogger } from '@ecommerce/observability';
import { cancelOrderForStockFailure } from '../services/orderService';

const logger = createLogger({ serviceName: 'order-service' });

const kafka = createKafka(config.KAFKA_CLIENT_ID, config.KAFKA_BROKER.split(','));

let producer: Producer | null = null;
let consumer: Consumer | undefined;
let stopping = false;
let retryTimer: NodeJS.Timeout | undefined;

export const connectKafkaProducer = async (): Promise<void> => {
  try {
    const connected = kafka.producer({
      idempotent: true,
      createPartitioner: Partitioners.DefaultPartitioner,
    });
    await connected.connect();
    producer = connected;
    consumer = kafka.consumer({ groupId: 'order-stock-events-v1' });
    await consumer.connect();
    await consumer.subscribe({
      topics: [TOPICS.stockReservationFailed],
      fromBeginning: true,
    });
    await runConsumer({
      consumer,
      isRetryable: (error) => {
        const known = normalizeError(error);
        return !known || known.statusCode >= 500;
      },
      dlq: producer,
      topics: [TOPICS.stockReservationFailed],
      decode: (_topic, bytes) => decodeStockReservationFailed(bytes),
      handle: async (event) => {
        if (!event.orderId) throw new ValidationError('Missing order ID');
        await cancelOrderForStockFailure(event.orderId);
      },
    });
    logger.info('Order Kafka connected');
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ msg }, 'Kafka connection failed');
    await consumer?.disconnect().catch(() => undefined);
    await producer?.disconnect().catch(() => undefined);
    producer = null;
    if (!stopping)
      retryTimer = setTimeout(() => {
        void connectKafkaProducer();
      }, 5000);
  }
};

export const getKafkaProducer = (): Producer | null => producer;

export const publishEvent = async (topic: string, key: string, data: unknown): Promise<void> => {
  if (!producer) {
    throw new Error('Kafka Producer is not connected');
  }

  let value: Buffer;
  let contentType = 'application/x-protobuf';
  if (topic === TOPICS.orderCreated) {
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

  logger.debug({ topic, key }, 'Published event');
};

export const disconnectKafkaProducer = async (): Promise<void> => {
  stopping = true;
  if (retryTimer) clearTimeout(retryTimer);
  await consumer?.disconnect();
  if (producer) {
    await producer.disconnect();
    logger.info('Order Kafka disconnected');
  }
  producer = null;
};
