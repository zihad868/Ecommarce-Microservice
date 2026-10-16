import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import validateRequest from '../middleware/validateRequest';
import type { Request, Response, NextFunction } from 'express';

describe('validateRequest', () => {
  const schema = {
    body: z.object({
      name: z.string().min(2),
      age: z.number().int().positive(),
    }),
  };

  it('should pass validation with valid body', async () => {
    const middleware = validateRequest(schema);
    const req = {
      body: { name: 'Alice', age: 30 },
    } as unknown as Request;
    const res = {} as Response;
    const next = vi.fn() as unknown as NextFunction;

    await middleware(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.body).toEqual({ name: 'Alice', age: 30 });
  });

  it('should call next with ZodError when invalid', async () => {
    const middleware = validateRequest(schema);
    const req = {
      body: { name: 'A', age: -5 },
    } as unknown as Request;
    const res = {} as Response;
    const next = vi.fn() as unknown as NextFunction;

    await middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    const error = (next as any).mock.calls[0][0];
    expect(error).toBeInstanceOf(z.ZodError);
  });
});
