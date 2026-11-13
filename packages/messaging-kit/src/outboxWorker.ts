export interface OutboxRow {
  id: string;
  aggregateId: string;
  eventType: string;
  payload: unknown;
  retryCount: number;
}

export interface OutboxTx {
  $queryRaw<T = unknown>(query: TemplateStringsArray, ...values: unknown[]): Promise<T>;
  outboxEvent: {
    update(args: {
      where: { id: string };
      data: {
        retryCount?: number;
        lastError?: string;
        status?: string;
        nextAttemptAt?: Date;
        publishedAt?: Date;
      };
    }): Promise<unknown>;
  };
}

export interface OutboxDb {
  $transaction<T>(fn: (tx: any) => Promise<T>, o?: { timeout?: number }): Promise<T>;
  outboxEvent: {
    deleteMany(args: any): Promise<unknown>;
    count(args?: any): Promise<number>;
  };
}

export interface LoggerLike {
  info(obj: unknown, msg?: string): void;
  warn?(obj: unknown, msg?: string): void;
  error(obj: unknown, msg?: string): void;
  debug?(obj: unknown, msg?: string): void;
}

export interface CreateOutboxWorkerOptions {
  db: OutboxDb;
  publish: (topic: string, key: string, payload: unknown) => Promise<void>;
  topicFor: (eventType: string) => string;
  logger: LoggerLike;
  batchSize?: number;
  maxRetries?: number;
  intervalMs?: number;
  onMetricsUpdate?: (counts: { pending: number; failed: number }) => void;
}

export interface OutboxWorker {
  start(intervalOverrideMs?: number): void;
  stop(): Promise<void>;
  processOnce(batchSize?: number): Promise<number>;
  maintain(): Promise<void>;
}

export const createOutboxWorker = (opts: CreateOutboxWorkerOptions): OutboxWorker => {
  const {
    db,
    publish,
    topicFor,
    logger,
    batchSize: defaultBatchSize = 20,
    maxRetries = 8,
    intervalMs: defaultIntervalMs = 1000,
    onMetricsUpdate,
  } = opts;

  const processOnce = async (batchSize = defaultBatchSize): Promise<number> => {
    if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 100) {
      throw new RangeError('Invalid batch size');
    }

    return db.$transaction(
      async (rawTx: unknown) => {
        const tx = rawTx as OutboxTx;
        const rows = await tx.$queryRaw<OutboxRow[]>`
        SELECT id, "aggregateId", "eventType", payload, "retryCount" FROM "OutboxEvent"
        WHERE status = 'PENDING' AND "nextAttemptAt" <= NOW()
        ORDER BY "createdAt", id LIMIT ${batchSize} FOR UPDATE SKIP LOCKED`;
        let published = 0;

        for (const row of rows) {
          try {
            const targetTopic = topicFor(row.eventType);
            await publish(targetTopic, row.aggregateId, row.payload);
          } catch (err) {
            const retryCount = row.retryCount + 1;
            const lastError = err instanceof Error ? err.message : String(err);
            await tx.outboxEvent.update({
              where: { id: row.id },
              data: {
                retryCount,
                lastError,
                status: retryCount >= maxRetries ? 'FAILED' : 'PENDING',
                nextAttemptAt: new Date(Date.now() + Math.min(2 ** retryCount * 1000, 300_000)),
              },
            });
            logger.error({ eventId: row.id, retryCount, lastError }, 'Outbox publication failed');
            continue;
          }

          await tx.outboxEvent.update({
            where: { id: row.id },
            data: {
              status: 'PUBLISHED',
              publishedAt: new Date(),
            },
          });
          published++;
        }

        return published;
      },
      { timeout: 30_000 },
    );
  };

  const maintain = async (): Promise<void> => {
    await db.outboxEvent.deleteMany({
      where: {
        status: 'PUBLISHED',
        publishedAt: { lt: new Date(Date.now() - 7 * 86_400_000) },
      },
    });
  };

  let running = false;
  let timer: NodeJS.Timeout | undefined;
  let inFlight: Promise<void> | undefined;

  const start = (intervalMs = defaultIntervalMs): void => {
    if (running) return;

    running = true;
    let nextMaintenance = 0;

    const tick = async () => {
      try {
        await processOnce();

        if (Date.now() >= nextMaintenance) {
          await maintain();

          if (onMetricsUpdate) {
            const pending = await db.outboxEvent.count({ where: { status: 'PENDING' } });
            const failed = await db.outboxEvent.count({ where: { status: 'FAILED' } });
            onMetricsUpdate({ pending, failed });
          }

          nextMaintenance = Date.now() + 60_000;
        }
      } catch (err) {
        logger.error({ err }, 'Outbox tick failed');
      } finally {
        if (running) {
          timer = setTimeout(() => {
            inFlight = tick();
          }, intervalMs);
        }
      }
    };

    inFlight = tick();
  };

  const stop = async (): Promise<void> => {
    running = false;

    if (timer) clearTimeout(timer);

    await inFlight;
  };

  return {
    start,
    stop,
    processOnce,
    maintain,
  };
};
