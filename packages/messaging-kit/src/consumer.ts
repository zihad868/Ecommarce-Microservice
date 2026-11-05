import type { Consumer, KafkaMessage, Producer } from 'kafkajs';

export async function sendDlq(
  producer: Producer,
  topic: string,
  message: KafkaMessage,
  errorReason: string,
): Promise<void> {
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
        },
      },
    ],
  });
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  baseDelayMs = 100,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts) {
        const delay = baseDelayMs * Math.pow(2, attempt - 1);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw lastError;
}

export async function runConsumer<T>(opts: {
  consumer: Consumer;
  dlq: Producer;
  topics: string[];
  decode: (topic: string, bytes: Buffer) => T;
  handle: (event: T) => Promise<void>;
  maxAttempts?: number;
}): Promise<void> {
  await opts.consumer.run({
    eachMessage: async ({ topic, message }) => {
      if (!message.value) return;
      let event: T;
      try {
        event = opts.decode(topic, message.value);
      } catch (e) {
        await sendDlq(opts.dlq, topic, message, `decode: ${String(e)}`);
        return;
      }
      try {
        await withRetry(() => opts.handle(event), opts.maxAttempts ?? 3);
      } catch (e) {
        await sendDlq(opts.dlq, topic, message, String(e));
      }
    },
  });
}
