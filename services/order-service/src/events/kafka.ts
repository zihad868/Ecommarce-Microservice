import { type Producer, type Consumer, Partitioners } from 'kafkajs';
import { createKafka, encodeOrderCreated, ORDER_CREATED_TOPIC } from '@ecommerce/messaging-kit';
import config from '../config';
import { createLogger } from '@ecommerce/observability';
import { cancelForStockFailure } from '../services/orderService';
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
      topics: ['StockReservationFailed', 'StockReleased'],
      fromBeginning: true,
    });
    await consumer.run({
      eachMessage: async ({ message }) => {
        if (!message.value) return;
        const event = JSON.parse(message.value.toString()) as { orderId?: string };
        if (!event.orderId) throw new Error('Missing order ID');
        await cancelForStockFailure(event.orderId);
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

  await producer.send({
    topic,
    messages: [
      {
        key,
        value: topic === ORDER_CREATED_TOPIC ? encodeOrderCreated(data) : JSON.stringify(data),
        headers: {
          'content-type':
            topic === ORDER_CREATED_TOPIC ? 'application/x-protobuf' : 'application/json',
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
