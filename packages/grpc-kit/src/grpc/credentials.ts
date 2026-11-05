import * as grpc from '@grpc/grpc-js';

/**
 * Returns gRPC client credentials based on TLS configuration.
 */
export const getClientCredentials = (
  useTls = false,
  rootCert?: Buffer,
): grpc.ChannelCredentials => {
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
  if (useTls && keyCertPairs.length > 0) {
    return grpc.ServerCredentials.createSsl(rootCert ?? null, keyCertPairs);
  }
  return grpc.ServerCredentials.createInsecure();
};
