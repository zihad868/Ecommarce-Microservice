import { PrismaClient } from '../generated/client';

const prisma = new PrismaClient();

export { Prisma, ProcessedEvent, Product } from '../generated/client';
export { PrismaClient };
export default prisma;
