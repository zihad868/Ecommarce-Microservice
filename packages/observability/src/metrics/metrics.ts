import client, { type Registry, type Counter, type Histogram } from 'prom-client';
import type { Request, Response, NextFunction } from 'express';

export interface MetricsRegistryBundle {
  register: Registry;
  httpRequestCounter: Counter;
  httpRequestDuration: Histogram;
  grpcRequestCounter: Counter;
  grpcRequestDuration: Histogram;
}

let metricsBundle: MetricsRegistryBundle | null = null;

export const initMetrics = (serviceName: string): MetricsRegistryBundle => {
  if (metricsBundle) {
    return metricsBundle;
  }

  const register = new client.Registry();
  register.setDefaultLabels({ service: serviceName });

  client.collectDefaultMetrics({ register });

  const httpRequestCounter = new client.Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests processed',
    labelNames: ['method', 'route', 'status_code'],
    registers: [register],
  });

  const httpRequestDuration = new client.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    registers: [register],
  });

  const grpcRequestCounter = new client.Counter({
    name: 'grpc_requests_total',
    help: 'Total number of gRPC requests handled',
    labelNames: ['method', 'status'],
    registers: [register],
  });

  const grpcRequestDuration = new client.Histogram({
    name: 'grpc_request_duration_seconds',
    help: 'Duration of gRPC requests in seconds',
    labelNames: ['method', 'status'],
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5],
    registers: [register],
  });

  metricsBundle = {
    register,
    httpRequestCounter,
    httpRequestDuration,
    grpcRequestCounter,
    grpcRequestDuration,
  };

  return metricsBundle;
};

export const getMetricsBundle = (): MetricsRegistryBundle => {
  if (!metricsBundle) {
    return initMetrics('unknown-service');
  }
  return metricsBundle;
};

/**
 * Express middleware to record HTTP metrics.
 */
export const metricsMiddleware = () => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.path === '/metrics' || req.path.startsWith('/health')) {
      next();
      return;
    }

    const start = process.hrtime();
    res.on('finish', () => {
      const diff = process.hrtime(start);
      const durationSeconds = diff[0] + diff[1] / 1e9;
      const route = req.route ? (req.route as { path: string }).path : req.baseUrl || req.path;
      const statusCode = String(res.statusCode);

      const bundle = getMetricsBundle();
      bundle.httpRequestCounter.inc({
        method: req.method,
        route,
        status_code: statusCode,
      });
      bundle.httpRequestDuration.observe(
        {
          method: req.method,
          route,
          status_code: statusCode,
        },
        durationSeconds,
      );
    });

    next();
  };
};

/**
 * HTTP handler to expose Prometheus metrics.
 */
export const metricsHandler = async (_req: Request, res: Response): Promise<void> => {
  const bundle = getMetricsBundle();
  res.set('Content-Type', bundle.register.contentType);
  res.end(await bundle.register.metrics());
};
