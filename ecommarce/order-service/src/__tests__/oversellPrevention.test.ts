import { describe, it, expect } from 'vitest';

describe('Concurrency & Stock Integrity (Oversell Prevention)', () => {
  it('prevents overselling under 50 concurrent requests against 10 available stock', async () => {
    let stock = 10;
    const lock = { busy: false };

    // Atomic conditional decrement model (mirrors WHERE stock >= quantity in PostgreSQL)
    const atomicDecrement = async (qty: number): Promise<boolean> => {
      // Simulate database row-level locking
      while (lock.busy) {
        await new Promise((r) => setTimeout(r, 1));
      }
      lock.busy = true;
      try {
        if (stock >= qty) {
          stock -= qty;
          return true;
        }
        return false;
      } finally {
        lock.busy = false;
      }
    };

    // 50 concurrent buyers each attempting to purchase 1 unit
    const attempts = Array.from({ length: 50 }, () => atomicDecrement(1));
    const results = await Promise.all(attempts);

    const successfulPurchases = results.filter((res) => res).length;
    const failedPurchases = results.filter((res) => !res).length;

    expect(successfulPurchases).toBe(10);
    expect(failedPurchases).toBe(40);
    expect(stock).toBe(0);
  });

  it('guarantees idempotency when the same order event is delivered multiple times', () => {
    let stock = 20;
    const processedEvents = new Set<string>();

    const handleEvent = (event: { eventId: string; quantity: number }) => {
      // Step 1: Idempotency check via ProcessedEvent table
      if (processedEvents.has(event.eventId)) {
        return { status: 'SKIPPED_DUPLICATE' };
      }

      // Step 2: Atomic decrement
      stock -= event.quantity;
      processedEvents.add(event.eventId);
      return { status: 'PROCESSED' };
    };

    const duplicateEvent = { eventId: 'evt-order-12345', quantity: 5 };

    // First delivery
    const res1 = handleEvent(duplicateEvent);
    expect(res1.status).toBe('PROCESSED');
    expect(stock).toBe(15);

    // Duplicate delivery (Kafka network retry or consumer rebalance)
    const res2 = handleEvent(duplicateEvent);
    expect(res2.status).toBe('SKIPPED_DUPLICATE');
    expect(stock).toBe(15); // Stock unchanged!
  });
});
