import { PrismaClient } from '../generated/client';

const prisma = new PrismaClient();

export { Prisma, RefreshToken, Role, User } from '../generated/client';
export { PrismaClient };
export default prisma;
