import { describe, expect, it, vi } from 'vitest';
import { createOutboxWorker, type OutboxDb, type OutboxTx } from '../outboxWorker';

describe('createOutboxWorker', () => {
  it('publishes pending events and marks them PUBLISHED', async () => {
    const publishedRecords: unknown[] = [];
    const updatedStatus: unknown[] = [];

    const mockTx: OutboxTx = {
      $queryRaw: vi.fn().mockResolvedValue([
        {
          id: '1',
          aggregateId: 'agg-1',
          eventType: 'OrderCreated',
          payload: { orderId: 'agg-1' },
          retryCount: 0,
        },
      ]),
      outboxEvent: {
        update: vi.fn().mockImplementation((args: unknown) => {
          updatedStatus.push(args);
          return Promise.resolve();
        }),
      },
    };

    const mockDb: OutboxDb = {
      $transaction: vi
        .fn()
        .mockImplementation((fn: (tx: OutboxTx) => Promise<unknown>) => fn(mockTx)),
      outboxEvent: {
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
        count: vi.fn().mockResolvedValue(0),
      },
    };

    const mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    const publish = vi.fn().mockImplementation((topic, key, payload) => {
      publishedRecords.push({ topic, key, payload });
      return Promise.resolve();
    });

    const topicFor = vi.fn().mockReturnValue('order.created.v1');

    const worker = createOutboxWorker({
      db: mockDb,
      publish,
      topicFor,
      logger: mockLogger,
    });

    const publishedCount = await worker.processOnce(10);
    expect(publishedCount).toBe(1);
    expect(publishedRecords).toHaveLength(1);
    expect(topicFor).toHaveBeenCalledWith('OrderCreated');
    expect(publish).toHaveBeenCalledWith('order.created.v1', 'agg-1', { orderId: 'agg-1' });
    expect(updatedStatus).toHaveLength(1);
    expect(updatedStatus[0]).toMatchObject({
      where: { id: '1' },
      data: { status: 'PUBLISHED' },
    });
  });

  it('increments retry count on publish failure and marks FAILED after maxRetries', async () => {
    const updatedStatus: unknown[] = [];

    const mockTx: OutboxTx = {
      $queryRaw: vi.fn().mockResolvedValue([
        {
          id: '2',
          aggregateId: 'agg-2',
          eventType: 'OrderCreated',
          payload: { orderId: 'agg-2' },
          retryCount: 2,
        },
      ]),
      outboxEvent: {
        update: vi.fn().mockImplementation((args: unknown) => {
          updatedStatus.push(args);
          return Promise.resolve();
        }),
      },
    };

    const mockDb: OutboxDb = {
      $transaction: vi
        .fn()
        .mockImplementation((fn: (tx: OutboxTx) => Promise<unknown>) => fn(mockTx)),
      outboxEvent: {
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
        count: vi.fn().mockResolvedValue(0),
      },
    };

    const worker = createOutboxWorker({
      db: mockDb,
      publish: vi.fn().mockRejectedValue(new Error('Network error')),
      topicFor: () => 'order.created.v1',
      logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
      maxRetries: 3,
    });

    const count = await worker.processOnce();
    expect(count).toBe(0);
    expect(updatedStatus[0]).toMatchObject({
      where: { id: '2' },
      data: {
        retryCount: 3,
        status: 'FAILED',
        lastError: 'Network error',
      },
    });
  });

  it('maintains outbox by deleting published events', async () => {
    const deleteMany = vi.fn().mockResolvedValue({ count: 5 });
    const mockDb: OutboxDb = {
      $transaction: vi.fn(),
      outboxEvent: {
        deleteMany,
        count: vi.fn().mockResolvedValue(0),
      },
    };

    const worker = createOutboxWorker({
      db: mockDb,
      publish: vi.fn(),
      topicFor: () => 'any',
      logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    });

    await worker.maintain();
    expect(deleteMany).toHaveBeenCalled();
  });
});
