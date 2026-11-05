import { describe, expect, it, afterEach } from 'vitest';
import { getClientCredentials, getServerCredentials } from '../grpc/credentials';

describe('gRPC credentials mTLS enforcement', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('throws when NODE_ENV is production and TLS materials are missing', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.GRPC_TLS_CA;
    delete process.env.GRPC_TLS_CERT;
    delete process.env.GRPC_TLS_KEY;

    expect(() => getClientCredentials()).toThrow('gRPC mTLS material is required');
    expect(() => getServerCredentials()).toThrow('gRPC mTLS material is required');
  });

  it('throws when GRPC_TLS_REQUIRED is true and TLS materials are missing', () => {
    process.env.NODE_ENV = 'development';
    process.env.GRPC_TLS_REQUIRED = 'true';
    delete process.env.GRPC_TLS_CA;
    delete process.env.GRPC_TLS_CERT;
    delete process.env.GRPC_TLS_KEY;

    expect(() => getClientCredentials()).toThrow('gRPC mTLS material is required');
    expect(() => getServerCredentials()).toThrow('gRPC mTLS material is required');
  });

  it('returns insecure credentials outside production when TLS is not required', () => {
    process.env.NODE_ENV = 'test';
    delete process.env.GRPC_TLS_REQUIRED;
    delete process.env.GRPC_TLS_CA;
    delete process.env.GRPC_TLS_CERT;
    delete process.env.GRPC_TLS_KEY;

    const clientCreds = getClientCredentials();
    const serverCreds = getServerCredentials();

    expect(clientCreds).toBeDefined();
    expect(serverCreds).toBeDefined();
  });
});
