import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readdirSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const root = dirname(dirname(fileURLToPath(import.meta.url)));
function protos(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? protos(join(directory, entry.name)) : entry.name.endsWith('.proto') ? [join(directory, entry.name)] : []);
}
const output = join(root, 'packages/proto-gen/src/generated');
mkdirSync(output, { recursive: true });
const result = spawnSync(process.execPath, [
  require.resolve('@grpc/proto-loader/build/bin/proto-loader-gen-types.js'),
  '--outDir', output, '--grpcLib', '@grpc/grpc-js', '--longs', 'String', '--enums', 'String',
  '--defaults', '--oneofs', '--keepCase',
  '-I', join(root, 'contracts/proto'), '-I', join(root, 'contracts/events'),
  '--', ...protos(join(root, 'contracts/proto')), ...protos(join(root, 'contracts/events')),
], { cwd: root, stdio: 'inherit' });
if (result.status !== 0) process.exit(result.status ?? 1);
// Keep generated headers reproducible across developer machines and CI.
function normalize(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const file = join(directory, entry.name);
    if (entry.isDirectory()) normalize(file);
    else if (file.endsWith('.ts')) writeFileSync(file, readFileSync(file, 'utf8').replace(
      /^\/\/ Original file: (.*)$/m,
      (_line, source) => `// Original file: contracts/${source.replaceAll('\\', '/').split('contracts/').pop()}`,
    ).replaceAll('\r\n', '\n'));
  }
}
normalize(output);
