export interface OutboxMessage {
  id: string;
  aggregateId: string;
  topic: string;
  payload: unknown;
}

/** The service owns transactions and leases; the relay provides at-least-once delivery. */
export interface OutboxStore {
  claim(limit: number): Promise<OutboxMessage[]>;
  published(id: string): Promise<void>;
  failed(id: string, error: unknown): Promise<void>;
}

export const publishOutboxBatch = async (
  store: OutboxStore,
  publish: (message: OutboxMessage) => Promise<void>,
  limit = 20,
): Promise<number> => {
  let published = 0;

  for (const message of await store.claim(limit)) {
    try {
      await publish(message);
      await store.published(message.id);
      published++;
    } catch (error) {
      await store.failed(message.id, error);
      break;
    }
  }

  return published;
};
