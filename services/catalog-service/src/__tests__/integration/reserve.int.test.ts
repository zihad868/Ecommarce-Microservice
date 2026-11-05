import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import { beforeAll, afterAll, it, expect } from 'vitest';

let pg: StartedPostgreSqlContainer | undefined;
beforeAll(async () => {
  let dbUrl = process.env.TEST_CATALOG_DATABASE_URL ?? process.env.TEST_DATABASE_URL;
  if (!dbUrl) {
    pg = await new PostgreSqlContainer('postgres:15-alpine').start();
    dbUrl = pg.getConnectionUri();
  }
  process.env.DATABASE_URL = dbUrl;
  process.env.DIRECT_DATABASE_URL = dbUrl;
  const isRoot = fs.existsSync('services/catalog-service/prisma/schema.prisma');
  const schemaPath = isRoot
    ? 'services/catalog-service/prisma/schema.prisma'
    : 'prisma/schema.prisma';
  execSync(`npx prisma migrate deploy --schema ${schemaPath}`, { stdio: 'inherit' });
}, 120_000);

afterAll(async () => {
  if (pg) await pg.stop();
});

it('never oversells under 100 concurrent reservations', async () => {
  const { default: prisma } = await import('../../utils/prismaClient');
  const { reserveStock } = await import('../../services/stockService');
  const product = await prisma.product.create({
    data: { name: 'x', price: 1, stock: 10, category: 'c' },
  });
  const results = await Promise.allSettled(
    Array.from({ length: 100 }, (_, i) =>
      reserveStock(`order-${i}`, [{ productId: product.id, quantity: 1 }]),
    ),
  );
  expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(10);
  expect((await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).stock).toBe(0);
});
