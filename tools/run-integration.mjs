import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
const require = createRequire(import.meta.url);
const base = new URL(process.env.TEST_DATABASE_URL ?? 'postgresql://postgres@127.0.0.1:55439/postgres');
if (!['localhost', '127.0.0.1'].includes(base.hostname)) throw new Error('Integration database must be local');
const env = { ...process.env, LOG_LEVEL: 'fatal' };
for (const service of ['identity', 'catalog', 'order']) {
  const url = new URL(base);
  url.searchParams.set('schema', `integration_${service}`);
  url.searchParams.set('connection_limit', '5');
  url.searchParams.set('pool_timeout', '30');
  env[`TEST_${service.toUpperCase()}_DATABASE_URL`] = url.toString();
  const result = spawnSync(process.execPath, [require.resolve('prisma/build/index.js'),
    'migrate', 'deploy', '--schema', `services/${service}-service/prisma/schema.prisma`], {
    env: { ...env, DATABASE_URL: url.toString(), DIRECT_DATABASE_URL: url.toString() }, stdio: 'inherit',
  });
  if (result.status) process.exit(result.status);
}
const result = spawnSync(process.execPath, [join(dirname(require.resolve('vitest/package.json')), 'vitest.mjs'), 'run', 'tools/integration'], { env, stdio: 'inherit' });
process.exit(result.status ?? 1);
