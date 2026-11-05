import { execSync } from 'node:child_process';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';

let pg: StartedPostgreSqlContainer | undefined;

export async function setup() {
  let baseStr = process.env.TEST_DATABASE_URL;
  if (!baseStr) {
    try {
      pg = await new PostgreSqlContainer('postgres:15-alpine').start();
      baseStr = pg.getConnectionUri();
    } catch {
      baseStr = 'postgresql://postgres@127.0.0.1:5432/postgres';
    }
  }
  const base = new URL(baseStr);
  for (const service of ['identity', 'catalog', 'order']) {
    const url = new URL(base);
    url.searchParams.set('schema', `integration_${service}`);
    url.searchParams.set('connection_limit', '5');
    url.searchParams.set('pool_timeout', '30');
    process.env[`TEST_${service.toUpperCase()}_DATABASE_URL`] = url.toString();
    try {
      execSync(
        `npx prisma migrate deploy --schema services/${service}-service/prisma/schema.prisma`,
        {
          env: {
            ...process.env,
            DATABASE_URL: url.toString(),
            DIRECT_DATABASE_URL: url.toString(),
          },
          stdio: 'inherit',
        },
      );
    } catch {
      // Ignore if db is not accessible in local environment
    }
  }
}

export async function teardown() {
  if (pg) await pg.stop();
}
