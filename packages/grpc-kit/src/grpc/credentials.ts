import * as grpc from '@grpc/grpc-js';
import { readFileSync } from 'node:fs';

const tlsMaterial = () => {
  const { GRPC_TLS_CA, GRPC_TLS_CERT, GRPC_TLS_KEY } = process.env;
  if (!GRPC_TLS_CA || !GRPC_TLS_CERT || !GRPC_TLS_KEY) {
    if (process.env.GRPC_TLS_REQUIRED === 'true') throw new Error('gRPC mTLS material is required');
    return null;
  }
  return {
    ca: readFileSync(GRPC_TLS_CA),
    cert: readFileSync(GRPC_TLS_CERT),
    key: readFileSync(GRPC_TLS_KEY),
  };
};

/**
 * Returns gRPC client credentials based on TLS configuration.
 */
export const getClientCredentials = (
  useTls = false,
  rootCert?: Buffer,
): grpc.ChannelCredentials => {
  const material = tlsMaterial();
  if (material) return grpc.credentials.createSsl(material.ca, material.key, material.cert);
  if (useTls) {
    return grpc.credentials.createSsl(rootCert);
  }
  return grpc.credentials.createInsecure();
};

/**
 * Returns gRPC server credentials based on TLS configuration.
 */
export const getServerCredentials = (
  useTls = false,
  keyCertPairs: grpc.KeyCertPair[] = [],
  rootCert?: Buffer,
): grpc.ServerCredentials => {
  const material = tlsMaterial();
  if (material)
    return grpc.ServerCredentials.createSsl(
      material.ca,
      [{ private_key: material.key, cert_chain: material.cert }],
      true,
    );
  if (useTls && keyCertPairs.length > 0) {
    return grpc.ServerCredentials.createSsl(rootCert ?? null, keyCertPairs);
  }
  return grpc.ServerCredentials.createInsecure();
};
