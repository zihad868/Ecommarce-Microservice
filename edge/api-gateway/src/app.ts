import express from 'express';
import type { ErrorRequestHandler, Request, RequestHandler } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { Metadata } from '@grpc/grpc-js';
import { z } from 'zod';
import { ApiError, grpcToHttp } from '@ecommerce/errors';
import { correlationIdMiddleware } from '@ecommerce/observability';
import type { GatewayBackend } from './backend';

const credentialsSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1).max(1024),
});
const idSchema = z.string().min(1).max(128);

export function createApp(
  backend: GatewayBackend,
  options: {
    limiter?: RequestHandler;
    authLimiter?: RequestHandler;
    ready?: () => Promise<void>;
  } = {},
): express.Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet(), correlationIdMiddleware, express.json({ limit: '100kb' }));
  const context = (req: Request): Metadata => {
    const metadata = new Metadata();
    metadata.set('x-correlation-id', String(req.headers['x-correlation-id']));
    const user = req.res?.locals.user as { userId: string; role: string } | undefined;
    if (user) {
      metadata.set('x-user-id', user.userId);
      metadata.set('x-user-role', user.role);
    }
    if (req.headers['idempotency-key'])
      metadata.set('idempotency-key', String(req.headers['idempotency-key']));
    return metadata;
  };
  app.get('/health/live', (_req, res) => {
    res.json({ status: 'UP' });
  });
  app.get('/health/ready', async (_req, res) => {
    try {
      await options.ready?.();
      res.json({ status: 'READY' });
    } catch {
      res.status(503).json({ status: 'NOT_READY' });
    }
  });
  app.use(
    '/api',
    options.limiter ??
      rateLimit({ windowMs: 60_000, limit: 300, standardHeaders: 'draft-7', legacyHeaders: false }),
  );
  app.use(
    '/api/auth',
    options.authLimiter ??
      rateLimit({ windowMs: 900_000, limit: 30, standardHeaders: 'draft-7', legacyHeaders: false }),
  );
  app.post('/api/auth/register', async (req, res) => {
    res.status(201).json({
      success: true,
      data: await backend.register(credentialsSchema.parse(req.body), context(req)),
    });
  });
  app.post('/api/auth/login', async (req, res) => {
    res.json({
      success: true,
      data: await backend.login(credentialsSchema.parse(req.body), context(req)),
    });
  });
  app.post('/api/auth/refresh', async (req, res) => {
    const { refreshToken } = z
      .object({ refreshToken: z.string().min(1).max(1024) })
      .parse(req.body);
    res.json({ success: true, data: await backend.refresh(refreshToken, context(req)) });
  });
  app.get('/api/products', async (req, res) => {
    const result = await backend.products(JSON.stringify(req.query), context(req));
    res.json({
      success: true,
      data: result.products,
      meta: JSON.parse(result.metaJson) as unknown,
    });
  });
  app.get('/api/products/:id', async (req, res) => {
    const result = await backend.product(idSchema.parse(req.params.id), context(req));
    if (!result.success) throw new ApiError(404, result.error || 'Product not found');
    res.json({ success: true, data: result });
  });
  const protect: RequestHandler = async (req, res, next) => {
    const match = /^Bearer (\S+)$/.exec(req.headers.authorization ?? '');
    if (!match) throw new ApiError(401, 'Bearer token required');
    const user = await backend.validateToken(match[1], context(req));
    if (!user.valid || !user.userId) throw new ApiError(401, 'Invalid token');
    res.locals.user = user;
    next();
  };
  app.get('/api/auth/me', protect, async (req, res) => {
    res.json({ success: true, data: await backend.me(context(req)) });
  });
  app.post('/api/auth/logout', protect, async (req, res) => {
    const input = z.object({ refreshToken: z.string().max(1024).optional() }).parse(req.body ?? {});
    await backend.logout(input.refreshToken ?? '', context(req));
    res.json({ success: true });
  });
  app.post('/api/orders', protect, async (req, res) => {
    const input = z
      .object({
        items: z
          .array(z.object({ productId: idSchema, quantity: z.number().int().min(1).max(1000) }))
          .min(1)
          .max(100),
      })
      .parse(req.body);
    const key = z
      .string()
      .max(128)
      .parse(req.headers['idempotency-key'] ?? '');
    res
      .status(201)
      .json({ success: true, data: await backend.createOrder(input.items, key, context(req)) });
  });
  app.post('/api/orders/:id/pay', protect, async (req, res) => {
    const input = z
      .object({
        paymentMethod: z.enum(['MOCK', 'CREDIT_CARD', 'DEBIT_CARD', 'PAYPAL']).default('MOCK'),
      })
      .parse(req.body ?? {});
    res.json({
      success: true,
      data: await backend.payOrder(
        idSchema.parse(req.params.id),
        input.paymentMethod,
        context(req),
      ),
    });
  });
  app.patch('/api/orders/:id/status', protect, async (req, res) => {
    const input = z
      .object({
        status: z.enum(['PENDING', 'CONFIRMED', 'PAID', 'SHIPPED', 'COMPLETED', 'CANCELLED']),
      })
      .parse(req.body);
    res.json({
      success: true,
      data: await backend.updateOrder(idSchema.parse(req.params.id), input.status, context(req)),
    });
  });
  for (const action of ['create', 'update', 'delete'] as const) {
    const method = action === 'create' ? 'post' : action === 'update' ? 'patch' : 'delete';
    app[method](
      action === 'create' ? '/api/products' : '/api/products/:id',
      protect,
      async (req, res) => {
        if ((res.locals.user as { role: string }).role !== 'ADMIN')
          throw new ApiError(403, 'Administrator required');
        const data = await backend.mutateProduct(
          action,
          action === 'create' ? '' : idSchema.parse(req.params.id),
          JSON.stringify(req.body ?? {}),
          context(req),
        );
        res.status(action === 'create' ? 201 : 200).json({ success: true, data });
      },
    );
  }
  app.get('/api/orders', protect, async (req, res) => {
    const user = res.locals.user as { userId: string };
    const result = await backend.orders(user.userId, context(req));
    if (!result.success) throw new ApiError(502, 'Order query failed');
    res.json({ success: true, data: result.orders });
  });
  app.get('/api/orders/:id', protect, async (req, res) => {
    const user = res.locals.user as { userId: string; role: string };
    const result = await backend.order(idSchema.parse(req.params.id), context(req));
    if (!result.success || (result.userId !== user.userId && user.role !== 'ADMIN')) {
      throw new ApiError(404, 'Order not found');
    }
    res.json({ success: true, data: result });
  });
  app.use((_req, res) => {
    res.status(404).json({ success: false, error: 'Route not found' });
  });
  const errors: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
    let code = 500;
    let message = 'Internal service error';
    if (error instanceof z.ZodError) {
      code = 400;
      message = 'Invalid request';
    } else if (error instanceof ApiError) {
      code = error.statusCode;
      message = error.message;
    } else if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      typeof error.code === 'number'
    ) {
      code = grpcToHttp(error.code);
      message =
        code === 503
          ? 'Service unavailable'
          : code === 504
            ? 'Service timed out'
            : code < 500
              ? 'details' in error && typeof error.details === 'string'
                ? error.details
                : 'Request rejected'
              : message;
    } else if (error instanceof SyntaxError) {
      code = 400;
      message = 'Invalid JSON';
    } else if (error && typeof error === 'object' && 'status' in error && error.status === 413) {
      code = 413;
      message = 'Payload too large';
    }
    res.status(code).json({ success: false, error: message });
  };
  app.use(errors);
  return app;
}
