import { cpSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

// tsc does not copy the generated Prisma JavaScript runtime or its engine binary.
const source = resolve('src/generated/client');
if (!existsSync(source)) throw new Error('Prisma client missing; run npm run db:generate first');
cpSync(source, resolve('dist/generated/client'), { recursive: true });
