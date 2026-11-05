import { describe, expect, it } from 'vitest';
import { handlePrismaClientError, handlePrismaValidationError } from '../errors/prismaErrors';

describe('prismaErrors', () => {
  it('should map P2002 to 409 duplicate entry', () => {
    const res = handlePrismaClientError({
      code: 'P2002',
      meta: { target: ['email'] },
      message: 'Unique constraint failed',
    });
    expect(res.statusCode).toBe(409);
    expect(res.message).toContain('Duplicate entry');
    expect(res.errorMessages[0]?.path).toBe('email');
  });

  it('should map P2025 to 404 record not found', () => {
    const res = handlePrismaClientError({
      code: 'P2025',
      meta: { cause: 'Record does not exist.' },
      message: 'Record not found',
    });
    expect(res.statusCode).toBe(404);
    expect(res.message).toContain('Record not found');
  });

  it('should map validation error to 400', () => {
    const res = handlePrismaValidationError({
      message: 'Invalid argument provided',
    });
    expect(res.statusCode).toBe(400);
    expect(res.message).toBe('Validation error');
    expect(res.errorMessages[0]?.message).toBe('Invalid argument provided');
  });
});
