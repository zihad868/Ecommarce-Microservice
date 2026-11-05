import { describe, expect, it, vi } from 'vitest';
import type { Consumer, KafkaMessage, Producer, EachMessagePayload } from 'kafkajs';
import { runConsumer, sendDlq, withRetry } from '../consumer';

describe('consumer failures', () => {
  it('does not retry permanent failures', async () => {
    const failure = new Error('permanent');
    const handler = vi.fn().mockRejectedValue(failure);
    await expect(withRetry(handler, 3, 0, () => false)).rejects.toBe(failure);
    expect(handler).toHaveBeenCalledTimes(1);
  });
  it('retries transient failures up to the limit', async () => {
    const handler = vi.fn().mockRejectedValueOnce(new Error('transient')).mockResolvedValue('ok');
    await expect(withRetry(handler, 3, 0)).resolves.toBe('ok');
    expect(handler).toHaveBeenCalledTimes(2);
  });
  it('retains the original stack and message for DLQ diagnosis', async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const error = new Error('failed');
    error.stack = 'x'.repeat(5000);
    await sendDlq(
      { send } as unknown as Producer,
      'topic',
      { key: null, value: Buffer.from('event') } as KafkaMessage,
      error,
    );
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        topic: 'topic.dlq',
        messages: [
          expect.objectContaining({
            headers: expect.objectContaining({
              'failure-reason': 'failed',
              'failure-stack': 'x'.repeat(4000),
            }),
          }),
        ],
      }),
    );
  });
  it('propagates DLQ failure so the original offset is not committed', async () => {
    const failure = new Error('DLQ unavailable');
    const consumer = {
      run: vi.fn(async (options: { eachMessage: (payload: EachMessagePayload) => Promise<void> }) =>
        options.eachMessage({
          topic: 'topic',
          message: { value: Buffer.from('event') },
        } as EachMessagePayload),
      ),
    };
    await expect(
      runConsumer({
        consumer: consumer as unknown as Consumer,
        dlq: { send: vi.fn().mockRejectedValue(failure) } as unknown as Producer,
        topics: ['topic'],
        decode: () => {
          throw new Error('decode failed');
        },
        handle: vi.fn(),
      }),
    ).rejects.toBe(failure);
  });
});
