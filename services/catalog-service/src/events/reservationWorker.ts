import { loadOrder } from '@ecommerce/proto-gen';
import { getClientCredentials } from '@ecommerce/grpc-kit';
import { createLogger } from '@ecommerce/observability';
import prisma from '../utils/prismaClient';
import { releaseStock } from '../services/stockService';

const logger = createLogger({ serviceName: 'catalog-service' });
const client = new (loadOrder().order.v1.OrderService)(
  process.env.ORDER_GRPC_URL ?? 'localhost:50053',
  getClientCredentials(),
);
let stopped = false;
let timer: NodeJS.Timeout | undefined;
let inFlight: Promise<void> | undefined;

export const reconcileReservations = async () => {
  const rows = await prisma.stockReservation.findMany({
    where: { status: 'RESERVED', createdAt: { lte: new Date(Date.now() - 15 * 60_000) } },
    orderBy: { updatedAt: 'asc' },
    take: 100,
  });

  for (const row of rows) {
    try {
      // Order service atomically cancels PENDING orders before permitting a release.
      // Unreachable order service leaves stock reserved for a later retry.
      const result = await new Promise<{ release: boolean; commit: boolean }>((resolve, reject) => {
        client.ReconcileReservation(
          { orderId: row.orderId },
          { deadline: new Date(Date.now() + 5000) },
          (error, response) => {
            if (error) reject(error);
            else if (response) resolve(response);
            else reject(new Error('Empty response'));
          },
        );
      });

      if (result.release) await releaseStock(row.orderId);
      else
        await prisma.stockReservation.updateMany({
          where: { id: row.id, status: 'RESERVED' },
          data: { status: result.commit ? 'COMMITTED' : 'RESERVED', updatedAt: new Date() },
        });
    } catch (err) {
      logger.error({ err, orderId: row.orderId }, 'Reservation reconciliation failed');
    }
  }
};

export const startReservationWorker = () => {
  const tick = async () => {
    try {
      await reconcileReservations();
    } catch (err) {
      logger.error({ err }, 'Reservation expiry failed');
    }

    if (!stopped)
      timer = setTimeout(() => {
        inFlight = tick();
      }, 60_000);
  };

  inFlight = tick();
};

export const stopReservationWorker = async () => {
  stopped = true;

  if (timer) clearTimeout(timer);

  await inFlight;
  client.close();
};
