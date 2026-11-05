import jwt from 'jsonwebtoken';
import { ApiError } from '@ecommerce/errors';
import type { TokenResult } from './backend';
export function localTokenVerifier(
  publicKey: string,
  revocation: { get(key: string): Promise<string | null> },
) {
  return async (token: string): Promise<TokenResult> => {
    let payload: jwt.JwtPayload;
    try {
      const decoded = jwt.verify(token, publicKey.replace(/\\n/g, '\n'), {
        algorithms: ['RS256'],
        issuer: 'ecommerce-identity',
        audience: 'ecommerce-gateway',
      });
      if (typeof decoded === 'string') throw new Error('Invalid claims');
      payload = decoded;
      if (
        typeof payload.id !== 'string' ||
        !['USER', 'ADMIN'].includes(String(payload.role)) ||
        typeof payload.issuedAt !== 'number' ||
        typeof payload.exp !== 'number'
      )
        throw new Error('Invalid claims');
    } catch {
      throw new ApiError(401, 'Invalid token');
    }
    let cutoff: string | null = null;
    try {
      cutoff = await revocation.get(`auth:revoked-before:${String(payload.id)}`);
    } catch {
      /* Redis outage degrades to signature and expiry validation. */
    }
    if (cutoff && Number(payload.issuedAt) <= Number(cutoff))
      throw new ApiError(401, 'Token revoked');
    return { valid: true, userId: String(payload.id), role: String(payload.role), error: '' };
  };
}
