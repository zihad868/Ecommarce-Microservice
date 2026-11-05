import { describe, expect, it } from 'vitest';
import { ApiError } from '../errors/ApiError';

describe('ApiError', () => {
  it('should instantiate with statusCode, message, and default isOperational=true', () => {
    const error = new ApiError(404, 'Item not found');
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.statusCode).toBe(404);
    expect(error.message).toBe('Item not found');
    expect(error.isOperational).toBe(true);
    expect(error.stack).toBeDefined();
  });

  it('should allow custom stack and isOperational=false', () => {
    const error = new ApiError(500, 'Server crashed', 'custom stack', false);
    expect(error.statusCode).toBe(500);
    expect(error.message).toBe('Server crashed');
    expect(error.stack).toBe('custom stack');
    expect(error.isOperational).toBe(false);
  });
});
