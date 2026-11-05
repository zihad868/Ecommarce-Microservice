import { describe, expect, it, vi } from 'vitest';
import { requireRole } from '../middleware/authRole';
import { ApiError } from '../errors/ApiError';
import type { Request, Response, NextFunction } from 'express';

describe('requireRole middleware', () => {
  it('should throw 401 if user is not authenticated', () => {
    const middleware = requireRole('ADMIN');
    const req = {} as Request;
    const res = {} as Response;
    const next = vi.fn() as unknown as NextFunction;

    expect(() => {
      middleware(req, res, next);
    }).toThrow(ApiError);
    try {
      middleware(req, res, next);
    } catch (e: any) {
      expect(e.statusCode).toBe(401);
    }
  });

  it('should throw 403 if user role does not match', () => {
    const middleware = requireRole('ADMIN');
    const req = { user: { id: '1', role: 'USER' } } as Request;
    const res = {} as Response;
    const next = vi.fn() as unknown as NextFunction;

    expect(() => {
      middleware(req, res, next);
    }).toThrow(ApiError);
    try {
      middleware(req, res, next);
    } catch (e: any) {
      expect(e.statusCode).toBe(403);
    }
  });

  it('should call next if user has allowed role', () => {
    const middleware = requireRole('ADMIN');
    const req = { user: { id: '1', role: 'ADMIN' } } as Request;
    const res = {} as Response;
    const next = vi.fn() as unknown as NextFunction;

    middleware(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });
});
