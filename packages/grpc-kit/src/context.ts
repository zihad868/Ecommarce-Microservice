import type { Metadata } from '@grpc/grpc-js';
import { ApiError } from '@ecommerce/errors';

// Accept identity only over the private, authenticated gateway-to-service transport.
export function userContext(metadata: Metadata): { userId: string; role: string } {
  const [userId] = metadata.get('x-user-id');
  const [role] = metadata.get('x-user-role');
  if (typeof userId !== 'string' || !userId || (role !== 'USER' && role !== 'ADMIN')) {
    throw new ApiError(401, 'Authenticated gateway metadata required');
  }
  return { userId, role };
}
export function requireAdmin(metadata: Metadata): void {
  if (userContext(metadata).role !== 'ADMIN') throw new ApiError(403, 'Administrator required');
}
