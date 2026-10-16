/**
 * Custom API Error class for throwing structured HTTP errors throughout the service.
 *
 * Usage:
 *   throw new ApiError(404, 'Product not found');
 *   throw new ApiError(400, 'Invalid product data');
 */
class ApiError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string | undefined, stack = '') {
    super(message);
    this.statusCode = statusCode;
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export default ApiError;
