import express from 'express';
import type { Request, RequestHandler } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { Metadata } from '@grpc/grpc-js';
import { z } from 'zod';
import { ApiError, UnauthenticatedError, ForbiddenError, NotFoundError } from '@ecommerce/errors';
import { correlationIdMiddleware } from '@ecommerce/observability';
import type { Logger } from 'pino';
import { createErrorHandler } from './errorHandler';
import type { GatewayBackend } from './backend';

const credentialsSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1).max(1024),
});
const idSchema = z.string().min(1).max(128);

export const rejectRateLimitedRequest: RequestHandler = (_req, _res, next) => {
  next(new ApiError(429, 'Too many requests'));
};

export const createApp = (
  backend: GatewayBackend,
  options: {
    logger: Logger;
    limiter?: RequestHandler;
    authLimiter?: RequestHandler;
    ready?: () => Promise<void>;
  },
): express.Express => {
  const app = express();

  app.disable('x-powered-by');

  app.use(helmet(), correlationIdMiddleware, express.json({ limit: '100kb' }));

  const context = (req: Request): Metadata => {
    const metadata = new Metadata();
    metadata.set('x-correlation-id', req.correlationId);

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
      rateLimit({
        windowMs: 60_000,
        limit: 300,
        standardHeaders: 'draft-7',
        legacyHeaders: false,
        handler: rejectRateLimitedRequest,
      }),
  );

  app.use(
    '/api/auth',
    options.authLimiter ??
      rateLimit({
        windowMs: 900_000,
        limit: 30,
        standardHeaders: 'draft-7',
        legacyHeaders: false,
        handler: rejectRateLimitedRequest,
      }),
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

  const listProductsQuerySchema = z.object({
    category: z.string().trim().optional(),
    search: z.string().trim().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    cursor: z.string().optional(),
  });

  app.get('/api/products', async (req, res) => {
    const query = listProductsQuerySchema.parse(req.query);
    const result = await backend.products(query, context(req));
    res.json({
      success: true,
      data: result.products,
      meta: result.page ?? (result.metaJson ? JSON.parse(result.metaJson) : undefined),
    });
  });

  app.get('/api/products/:id', async (req, res) => {
    const result = await backend.product(idSchema.parse(req.params.id), context(req));
    res.json({ success: true, data: result });
  });

  const protect: RequestHandler = async (req, res, next) => {
    const match = /^Bearer (\S+)$/.exec(req.headers.authorization ?? '');

    if (!match) throw new UnauthenticatedError('Bearer token required');

    const user = await backend.validateToken(match[1], context(req));

    if (!user.valid || !user.userId) throw new UnauthenticatedError('Invalid token');

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
          throw new ForbiddenError('Administrator required');

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
    const limit = req.query.limit ? Number(req.query.limit) : 50;
    const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined;
    const result = await backend.orders(user.userId, { limit, cursor }, context(req));
    res.json({ success: true, data: result.orders, nextCursor: result.nextCursor });
  });

  app.get('/api/orders/:id', protect, async (req, res) => {
    const user = res.locals.user as { userId: string; role: string };
    const result = await backend.order(idSchema.parse(req.params.id), context(req));

    if (result.userId !== user.userId && user.role !== 'ADMIN') {
      throw new NotFoundError('Order');
    }

    res.json({ success: true, data: result });
  });

  app.use((req, res) => {
    res.status(404).json({
      success: false,
      error: { code: 'ROUTE_NOT_FOUND', message: 'Route not found', requestId: req.requestId },
    });
  });

  app.use(createErrorHandler(options.logger));

  return app;
};
