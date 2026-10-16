import { PrismaClient } from '../generated/client';

const prisma = new PrismaClient();

export { Prisma, Role, User } from '../generated/client';
export { PrismaClient };
export default prisma;
