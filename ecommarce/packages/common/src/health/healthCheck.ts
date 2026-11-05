import type { Request, Response, Router } from 'express';
import { Router as createRouter } from 'express';

export interface HealthCheckOptions {
  checkDatabase?: () => Promise<void>;
  checkRedis?: () => Promise<void>;
  checkKafka?: () => Promise<void>;
}

/**
 * Creates Express health check router with /health/live and /health/ready endpoints.
 */
export const createHealthRouter = (options?: HealthCheckOptions): Router => {
  const router = createRouter();

  // Shallow liveness probe (K8s livenessProbe)
  router.get('/health/live', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'UP',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  });

  // Deep readiness probe (K8s readinessProbe)
  router.get('/health/ready', async (_req: Request, res: Response) => {
    const checks: Record<string, 'UP' | 'DOWN' | 'SKIPPED'> = {};
    const errors: Record<string, string> = {};

    let allHealthy = true;

    // Check Database
    if (options?.checkDatabase) {
      try {
        await Promise.race([
          options.checkDatabase(),
          new Promise((_, reject) => {
            setTimeout(() => {
              reject(new Error('DB check timed out'));
            }, 3000);
          }),
        ]);
        checks.database = 'UP';
      } catch (err: any) {
        checks.database = 'DOWN';
        errors.database = err?.message ?? 'Unknown database error';
        allHealthy = false;
      }
    } else {
      checks.database = 'SKIPPED';
    }

    // Check Redis
    if (options?.checkRedis) {
      try {
        await Promise.race([
          options.checkRedis(),
          new Promise((_, reject) => {
            setTimeout(() => {
              reject(new Error('Redis check timed out'));
            }, 3000);
          }),
        ]);
        checks.redis = 'UP';
      } catch (err: any) {
        checks.redis = 'DOWN';
        errors.redis = err?.message ?? 'Unknown redis error';
        allHealthy = false;
      }
    } else {
      checks.redis = 'SKIPPED';
    }

    // Check Kafka
    if (options?.checkKafka) {
      try {
        await Promise.race([
          options.checkKafka(),
          new Promise((_, reject) => {
            setTimeout(() => {
              reject(new Error('Kafka check timed out'));
            }, 3000);
          }),
        ]);
        checks.kafka = 'UP';
      } catch (err: any) {
        checks.kafka = 'DOWN';
        errors.kafka = err?.message ?? 'Unknown kafka error';
        allHealthy = false;
      }
    } else {
      checks.kafka = 'SKIPPED';
    }

    const statusCode = allHealthy ? 200 : 503;
    res.status(statusCode).json({
      status: allHealthy ? 'READY' : 'NOT_READY',
      timestamp: new Date().toISOString(),
      checks,
      errors: Object.keys(errors).length > 0 ? errors : undefined,
    });
  });

  return router;
};

export default createHealthRouter;
