import { Kafka, Producer, Partitioners } from 'kafkajs';

const kafka = new Kafka({
  clientId: 'order-service',
  brokers: [(process.env.KAFKA_BROKER ?? 'localhost:9092')],
});

let producer: Producer | null = null;

// ── Connect & create producer ───────────────────────────────
export const connectKafkaProducer = async (): Promise<void> => {
  try {
    producer = kafka.producer({
      createPartitioner: Partitioners.LegacyPartitioner,
    });
    await producer.connect();
    console.log('Order Service Kafka Producer connected');
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Kafka Producer connection failed, retrying in 5s...', msg);
    setTimeout(() => void connectKafkaProducer(), 5000);
  }
};

// ── Publish an event to a Kafka topic ──────────────────────
export const publishEvent = async (topic: string, data: unknown): Promise<void> => {
  if (!producer) {
    console.error('Kafka Producer not ready');
    return;
  }

  await producer.send({
    topic,
    messages: [
      {
        // key = topic name so related messages go to the same partition
        key: topic,
        value: JSON.stringify(data),
      },
    ],
  });

  console.log(`[Kafka] Published to topic "${topic}":`, data);
};

// ── Graceful shutdown ───────────────────────────────────────
export const disconnectKafkaProducer = async (): Promise<void> => {
  if (producer) {
    await producer.disconnect();
    console.log('Order Service Kafka Producer disconnected');
  }
};
