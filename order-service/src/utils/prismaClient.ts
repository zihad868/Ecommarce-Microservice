import { PrismaClient } from '../generated/client';

const prisma = new PrismaClient();

export { Order, OrderItem, OrderStatus, Prisma } from '../generated/client';
export { PrismaClient };
export default prisma;
