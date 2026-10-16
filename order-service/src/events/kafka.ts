import { Kafka, type Producer, Partitioners } from 'kafkajs';
import config from '../config';

const kafka = new Kafka({
  clientId: config.KAFKA_CLIENT_ID,
  brokers: [config.KAFKA_BROKER],
});

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
        value: JSON.stringify(data),
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
