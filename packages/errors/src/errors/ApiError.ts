/**
 * Custom API Error class for throwing structured HTTP errors throughout services.
 *
 * Usage:
 *   throw new ApiError(404, 'User not found');
 *   throw new ApiError(400, 'Email already in use');
 */
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(statusCode: number, message: string, stack = '', isOperational = true) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export default ApiError;
