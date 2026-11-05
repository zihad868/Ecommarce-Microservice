import { type Producer, Partitioners } from 'kafkajs';
import { createKafka, encodeOrderCreated, ORDER_CREATED_TOPIC } from '@ecommerce/messaging-kit';
import config from '../config';

const kafka = createKafka(config.KAFKA_CLIENT_ID, config.KAFKA_BROKER.split(','));

let producer: Producer | null = null;

export const connectKafkaProducer = async (): Promise<void> => {
  try {
    producer = kafka.producer({
      createPartitioner: Partitioners.DefaultPartitioner,
    });
    await producer.connect();
    console.log('Order Service Kafka Producer connected');
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Kafka Producer connection failed, retrying in 5s...', msg);
    setTimeout(() => {
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

  console.log(`[Kafka] Published event to "${topic}" with key "${key}"`);
};

export const disconnectKafkaProducer = async (): Promise<void> => {
  if (producer) {
    await producer.disconnect();
    console.log('Order Service Kafka Producer disconnected');
  }
};
