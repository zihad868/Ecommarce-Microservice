import { PrismaClient } from '../generated/client';

const prisma = new PrismaClient();

export {
  IdempotencyRecord,
  Order,
  OrderItem,
  OrderStatus,
  OutboxEvent,
  Prisma,
} from '../generated/client';
export { PrismaClient };
export default prisma;
