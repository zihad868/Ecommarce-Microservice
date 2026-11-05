import { PrismaClient } from '../generated/client';

const prisma = new PrismaClient();

export {
  Prisma,
  ProcessedEvent,
  Product,
  ReservationStatus,
  StockReservation,
} from '../generated/client';
export { PrismaClient };
export default prisma;
