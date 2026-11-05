import { describe, expect, it, vi } from 'vitest';
import catchAsync from '../shared/catchAsync';
import type { Request, Response, NextFunction } from 'express';

describe('catchAsync', () => {
  it('should call next with error when wrapped function rejects', async () => {
    const error = new Error('Async boom');
    const fn = vi.fn().mockRejectedValue(error);
    const handler = catchAsync(fn);

    const req = {} as Request;
    const res = {} as Response;
    const next = vi.fn() as unknown as NextFunction;

    handler(req, res, next);
    await new Promise((r) => setTimeout(r, 10));

    expect(fn).toHaveBeenCalledWith(req, res, next);
    expect(next).toHaveBeenCalledWith(error);
  });

  it('should not call next with error when wrapped function succeeds', async () => {
    const fn = vi.fn().mockResolvedValue(undefined);
    const handler = catchAsync(fn);

    const req = {} as Request;
    const res = {} as Response;
    const next = vi.fn() as unknown as NextFunction;

    handler(req, res, next);
    await new Promise((r) => setTimeout(r, 10));

    expect(fn).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });
});
