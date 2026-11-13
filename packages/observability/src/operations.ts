import { createServer } from 'node:http';
import { getMetricsBundle } from './metrics/metrics';

export const operationsServer = (check: () => Promise<unknown>) => {
  return createServer((req, res) => {
    void (async () => {
      if (req.url === '/metrics') {
        const { register } = getMetricsBundle();
        res.setHeader('Content-Type', register.contentType);
        res.end(await register.metrics());
      } else if (req.url === '/health/live') {
        res.setHeader('Content-Type', 'application/json');
        res.end('{"status":"UP"}');
      } else if (req.url === '/health/ready' || req.url === '/health') {
        await check();
        res.setHeader('Content-Type', 'application/json');
        res.end('{"status":"READY"}');
      } else res.writeHead(404).end();
    })().catch(() => {
      if (!res.headersSent) res.writeHead(503);

      res.end('{"status":"NOT_READY"}');
    });
  });
};
