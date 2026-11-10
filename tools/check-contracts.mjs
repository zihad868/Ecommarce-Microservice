import { createRequire } from 'node:module';
import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const loader = require('@grpc/proto-loader');
const root = dirname(dirname(fileURLToPath(import.meta.url)));
function check(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const filename = join(directory, entry.name);
    if (entry.isDirectory()) check(filename);
    else if (filename.endsWith('.proto'))
      loader.loadSync(filename, {
        includeDirs: [join(root, 'contracts/proto'), join(root, 'contracts/events')],
      });
  }
}
check(join(root, 'contracts/proto'));
check(join(root, 'contracts/events'));
console.log('All versioned protobuf contracts load successfully.');
