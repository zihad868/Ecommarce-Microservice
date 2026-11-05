import { Kafka } from 'kafkajs';
import type { EachMessagePayload, Producer } from 'kafkajs';

export function createKafka(clientId: string, brokers: string[]): Kafka {
  if (!brokers.length || brokers.some((broker) => !broker.trim())) {
    throw new Error('At least one Kafka broker is required');
  }
  return new Kafka({ clientId, brokers, retry: { retries: 5 } });
}

/** Failure to publish the DLQ must reject so Kafka does not commit the original offset. */
export async function forwardToDlq(
  producer: Producer,
  payload: EachMessagePayload,
  error: Error,
): Promise<void> {
  await producer.send({
    topic: `${payload.topic}.dlq`,
    messages: [
      {
        key: payload.message.key,
        value: payload.message.value,
        headers: {
          ...payload.message.headers,
          'original-topic': payload.topic,
          'original-partition': String(payload.partition),
          'original-offset': payload.message.offset,
          'failure-reason': error.message,
        },
      },
    ],
  });
}
