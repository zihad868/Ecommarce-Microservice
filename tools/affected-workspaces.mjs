import { execFileSync } from 'node:child_process';
import { appendFileSync, readdirSync } from 'node:fs';

const [base, head = 'HEAD'] = process.argv.slice(2);
const all = [
  'api-gateway',
  ...readdirSync('services', { withFileTypes: true })
    .filter((item) => item.isDirectory())
    .map((item) => item.name),
];
const diff = base
  ? execFileSync('git', ['diff', '--name-only', base, head], { encoding: 'utf8' })
      .trim()
      .split(/\r?\n/)
  : [];
const global =
  !base ||
  diff.some((file) =>
    /^(packages\/|contracts\/|tools\/|platform\/docker\/|\.github\/|\.dockerignore$|package(?:-lock)?\.json$|tsconfig.base.json$|turbo.json$)/.test(
      file,
    ),
  );
const affected = global
  ? all
  : all.filter((name) =>
      diff.some((file) =>
        file.startsWith(name === 'api-gateway' ? 'edge/api-gateway/' : `services/${name}/`),
      ),
    );
const images = affected.filter((name) =>
  ['api-gateway', 'identity-service', 'catalog-service', 'order-service'].includes(name),
);
const output = `services=${JSON.stringify(affected)}\nimages=${JSON.stringify(images)}\n`;

if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, output);
else process.stdout.write(output);
