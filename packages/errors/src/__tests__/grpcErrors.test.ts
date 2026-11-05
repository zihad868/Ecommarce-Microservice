import { Metadata, status } from '@grpc/grpc-js';
import { describe, expect, it } from 'vitest';
import {
  DomainError,
  InsufficientStockError,
  NotFoundError,
  IdempotencyConflictError,
  toGrpcError,
  grpcToHttp,
  fromGrpcError,
  normalizeError,
  isServerError,
} from '..';

describe('gRPC errors', () => {
  it('preserves domain code, status and details across multiple service hops', () => {
    const first = toGrpcError(new InsufficientStockError('Insufficient stock', { available: 1 }));
    const next = toGrpcError(fromGrpcError(first));
    expect(next.code).toBe(status.FAILED_PRECONDITION);
    expect(next.metadata.get('error-code')).toEqual(['INSUFFICIENT_STOCK']);
    expect(next.metadata.get('http-status')).toEqual(['409']);
    expect(fromGrpcError(next).details).toEqual({ available: 1 });
    expect(toGrpcError(new IdempotencyConflictError()).metadata.get('http-status')).toEqual([
      '422',
    ]);
  });
  it('never exposes internal messages or details', () => {
    for (const error of [
      new Error('password=secret'),
      new DomainError('INTERNAL', 'password=secret', 500, status.INTERNAL, { secret: true }),
    ]) {
      const grpc = toGrpcError(error);
      expect(grpc.code).toBe(status.INTERNAL);
      expect(grpc.details).toBe('Internal service error');
      expect(grpc.metadata.get('error-details-bin')).toEqual([]);
    }
  });
  it.each([
    ['P2002', 409],
    ['P2025', 404],
    ['P2003', 400],
    ['P2034', 409],
    ['P2024', 503],
    ['P1001', 503],
    ['P1002', 503],
    ['P1008', 503],
    ['P1017', 503],
  ])('normalizes Prisma %s', (code, http) => {
    expect(
      toGrpcError(Object.assign(new Error('database details'), { code })).metadata.get(
        'http-status',
      ),
    ).toEqual([String(http)]);
  });
  it('classifies client and server failures', () => {
    expect(normalizeError({ errorCode: 'P1001' })?.statusCode).toBe(503);
    expect(isServerError(new NotFoundError())).toBe(false);
    expect(isServerError({ code: 'P2002' })).toBe(false);
    expect(isServerError({ code: 'P1001' })).toBe(true);
    expect(isServerError(new Error('bug'))).toBe(true);
    expect(normalizeError({ code: 'unknown' })).toBeUndefined();
  });
  it('falls back safely for invalid metadata and malformed details', () => {
    const metadata = new Metadata();
    metadata.set('http-status', '200');
    metadata.set('error-details-bin', Buffer.from('invalid json'));
    const result = fromGrpcError({ code: status.NOT_FOUND, details: 'Missing', metadata });
    expect(result.statusCode).toBe(404);
    expect(result.details).toBeUndefined();
    expect(fromGrpcError(toGrpcError(new NotFoundError('Order'))).message).toBe('Order not found');
  });
  it.each([
    [status.ABORTED, 409],
    [status.DEADLINE_EXCEEDED, 504],
    [status.CANCELLED, 499],
    [status.OUT_OF_RANGE, 400],
    [status.UNKNOWN, 500],
  ])('maps status %s', (code, http) => {
    expect(grpcToHttp(code)).toBe(http);
  });
});
