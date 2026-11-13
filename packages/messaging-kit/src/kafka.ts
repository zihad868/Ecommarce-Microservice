import { Kafka } from 'kafkajs';
import type { EachMessagePayload, Producer } from 'kafkajs';
import { generateAuthToken } from 'aws-msk-iam-sasl-signer-js';

export const createKafka = (clientId: string, brokers: string[]): Kafka => {
  if (!brokers.length || brokers.some((broker) => !broker.trim())) {
    throw new Error('At least one Kafka broker is required');
  }

  const useIam = process.env.KAFKA_MSK_IAM === 'true';
  const region = process.env.AWS_REGION;

  if (useIam && !region) throw new Error('AWS_REGION is required for MSK IAM');

  return new Kafka({
    clientId,
    brokers,
    retry: { retries: 5 },
    ...(useIam
      ? {
          ssl: true,
          sasl: {
            mechanism: 'oauthbearer' as const,
            oauthBearerProvider: async () => ({
              value: (await generateAuthToken({ region: region ?? '' })).token,
            }),
          },
        }
      : {}),
  });
};

/** Failure to publish the DLQ must reject so Kafka does not commit the original offset. */
export const forwardToDlq = async (
  producer: Producer,
  payload: EachMessagePayload,
  error: Error,
): Promise<void> => {
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
};
