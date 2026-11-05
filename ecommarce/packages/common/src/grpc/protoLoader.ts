import path from 'path';
import * as protoLoader from '@grpc/proto-loader';
import * as grpc from '@grpc/grpc-js';

const DEFAULT_LOADER_OPTIONS: protoLoader.Options = {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
};

/**
 * Loads a .proto file and returns the typed gRPC package definition.
 * The protoDir defaults to the top-level /protos directory.
 */
export const loadProto = (protoFile: string, protoDir?: string): grpc.GrpcObject => {
  const resolvedDir = protoDir ?? path.join(__dirname, '../../../../protos');
  const protoPath = path.join(resolvedDir, protoFile);
  const packageDef = protoLoader.loadSync(protoPath, DEFAULT_LOADER_OPTIONS);
  return grpc.loadPackageDefinition(packageDef);
};
