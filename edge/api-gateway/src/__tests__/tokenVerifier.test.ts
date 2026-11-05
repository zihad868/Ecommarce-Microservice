import { describe, expect, it, vi } from 'vitest';
import { generateKeyPairSync } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { localTokenVerifier } from '../tokenVerifier';
import { ApiError } from '@ecommerce/errors';

const keys = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
});

const sign = (payload: Record<string, unknown>, opts?: jwt.SignOptions) =>
  jwt.sign(payload, keys.privateKey, {
    algorithm: 'RS256',
    issuer: 'ecommerce-identity',
    audience: 'ecommerce-gateway',
    expiresIn: '1h',
    ...opts,
  });

describe('localTokenVerifier fail-mode and security', () => {
  it('fails open for normal USER when Redis fails and increments error metric', async () => {
    const token = sign({ id: 'user-1', role: 'USER', issuedAt: Math.floor(Date.now() / 1000) });
    const redisMock = {
      get: vi.fn().mockRejectedValue(new Error('Redis connection refused')),
    };
    const metricsMock = { inc: vi.fn() };

    const verifier = localTokenVerifier(keys.publicKey, redisMock, metricsMock);
    const result = await verifier(token);

    expect(result.valid).toBe(true);
    expect(result.userId).toBe('user-1');
    expect(result.role).toBe('USER');
    expect(metricsMock.inc).toHaveBeenCalledTimes(1);
  });

  it('fails closed (503) for ADMIN when Redis fails and increments error metric', async () => {
    const token = sign({ id: 'admin-1', role: 'ADMIN', issuedAt: Math.floor(Date.now() / 1000) });
    const redisMock = {
      get: vi.fn().mockRejectedValue(new Error('Redis cluster down')),
    };
    const metricsMock = { inc: vi.fn() };

    const verifier = localTokenVerifier(keys.publicKey, redisMock, metricsMock);

    await expect(verifier(token)).rejects.toMatchObject({
      statusCode: 503,
      message: 'Session check unavailable',
    });
    expect(metricsMock.inc).toHaveBeenCalledTimes(1);
  });

  it('rejects revoked token when cutoff is greater than or equal to issuedAt', async () => {
    const issuedAt = Math.floor(Date.now() / 1000);
    const token = sign({ id: 'user-2', role: 'USER', issuedAt });
    const redisMock = {
      get: vi.fn().mockResolvedValue(String(issuedAt + 10)),
    };
    const verifier = localTokenVerifier(keys.publicKey, redisMock);

    await expect(verifier(token)).rejects.toBeInstanceOf(ApiError);
  });
});
