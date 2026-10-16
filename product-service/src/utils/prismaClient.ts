import { PrismaClient } from '../generated/client';

const prisma = new PrismaClient();

export { Prisma, Product } from '../generated/client';
export { PrismaClient };
export default prisma;
