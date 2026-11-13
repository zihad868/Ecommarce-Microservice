import type { Consumer, KafkaMessage, Producer } from 'kafkajs';

export const sendDlq = async (
  producer: Producer,
  topic: string,
  message: KafkaMessage,
  error: unknown,
): Promise<void> => {
  const errorReason = error instanceof Error ? error.message : String(error);
  await producer.send({
    topic: `${topic}.dlq`,
    messages: [
      {
        key: message.key,
        value: JSON.stringify({
          originalMessage: message.value ? message.value.toString('base64') : '',
          encoding: 'base64',
          error: errorReason,
          failedAt: new Date().toISOString(),
        }),
        headers: {
          ...message.headers,
          'original-topic': topic,
          'failure-reason': errorReason,
          'failure-stack': (error instanceof Error ? (error.stack ?? '') : '').slice(0, 4000),
        },
      },
    ],
  });
};

export const withRetry = async <T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  baseDelayMs = 100,
  shouldRetry: (error: unknown) => boolean = () => true,
): Promise<T> => {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (!shouldRetry(err)) throw err;

      lastError = err;

      if (attempt < maxAttempts) {
        const delay = baseDelayMs * Math.pow(2, attempt - 1);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  throw lastError;
};

export const runConsumer = async <T>(opts: {
  consumer: Consumer;
  dlq: Producer;
  topics: string[];
  decode: (topic: string, bytes: Buffer) => T;
  handle: (event: T) => Promise<void>;
  maxAttempts?: number;
  isRetryable?: (error: unknown) => boolean;
}): Promise<void> => {
  await opts.consumer.run({
    eachMessage: async ({ topic, message }) => {
      if (!message.value) return;

      let event: T;

      try {
        event = opts.decode(topic, message.value);
      } catch (e) {
        await sendDlq(opts.dlq, topic, message, e);

        return;
      }

      try {
        await withRetry(() => opts.handle(event), opts.maxAttempts ?? 3, 100, opts.isRetryable);
      } catch (e) {
        await sendDlq(opts.dlq, topic, message, e);
      }
    },
  });
};
