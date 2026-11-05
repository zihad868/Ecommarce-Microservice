// Original file: contracts/proto/inventory/v1/inventory.proto

import type * as grpc from '@grpc/grpc-js'
import type { MethodDefinition } from '@grpc/proto-loader'
import type { ReleaseStockRequest as _inventory_v1_ReleaseStockRequest, ReleaseStockRequest__Output as _inventory_v1_ReleaseStockRequest__Output } from '../../inventory/v1/ReleaseStockRequest';
import type { ReleaseStockResponse as _inventory_v1_ReleaseStockResponse, ReleaseStockResponse__Output as _inventory_v1_ReleaseStockResponse__Output } from '../../inventory/v1/ReleaseStockResponse';
import type { ReserveStockRequest as _inventory_v1_ReserveStockRequest, ReserveStockRequest__Output as _inventory_v1_ReserveStockRequest__Output } from '../../inventory/v1/ReserveStockRequest';
import type { ReserveStockResponse as _inventory_v1_ReserveStockResponse, ReserveStockResponse__Output as _inventory_v1_ReserveStockResponse__Output } from '../../inventory/v1/ReserveStockResponse';

export interface InventoryServiceClient extends grpc.Client {
  ReleaseStock(argument: _inventory_v1_ReleaseStockRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_inventory_v1_ReleaseStockResponse__Output>): grpc.ClientUnaryCall;
  ReleaseStock(argument: _inventory_v1_ReleaseStockRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_inventory_v1_ReleaseStockResponse__Output>): grpc.ClientUnaryCall;
  ReleaseStock(argument: _inventory_v1_ReleaseStockRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_inventory_v1_ReleaseStockResponse__Output>): grpc.ClientUnaryCall;
  ReleaseStock(argument: _inventory_v1_ReleaseStockRequest, callback: grpc.requestCallback<_inventory_v1_ReleaseStockResponse__Output>): grpc.ClientUnaryCall;
  releaseStock(argument: _inventory_v1_ReleaseStockRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_inventory_v1_ReleaseStockResponse__Output>): grpc.ClientUnaryCall;
  releaseStock(argument: _inventory_v1_ReleaseStockRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_inventory_v1_ReleaseStockResponse__Output>): grpc.ClientUnaryCall;
  releaseStock(argument: _inventory_v1_ReleaseStockRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_inventory_v1_ReleaseStockResponse__Output>): grpc.ClientUnaryCall;
  releaseStock(argument: _inventory_v1_ReleaseStockRequest, callback: grpc.requestCallback<_inventory_v1_ReleaseStockResponse__Output>): grpc.ClientUnaryCall;
  
  ReserveStock(argument: _inventory_v1_ReserveStockRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_inventory_v1_ReserveStockResponse__Output>): grpc.ClientUnaryCall;
  ReserveStock(argument: _inventory_v1_ReserveStockRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_inventory_v1_ReserveStockResponse__Output>): grpc.ClientUnaryCall;
  ReserveStock(argument: _inventory_v1_ReserveStockRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_inventory_v1_ReserveStockResponse__Output>): grpc.ClientUnaryCall;
  ReserveStock(argument: _inventory_v1_ReserveStockRequest, callback: grpc.requestCallback<_inventory_v1_ReserveStockResponse__Output>): grpc.ClientUnaryCall;
  reserveStock(argument: _inventory_v1_ReserveStockRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_inventory_v1_ReserveStockResponse__Output>): grpc.ClientUnaryCall;
  reserveStock(argument: _inventory_v1_ReserveStockRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_inventory_v1_ReserveStockResponse__Output>): grpc.ClientUnaryCall;
  reserveStock(argument: _inventory_v1_ReserveStockRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_inventory_v1_ReserveStockResponse__Output>): grpc.ClientUnaryCall;
  reserveStock(argument: _inventory_v1_ReserveStockRequest, callback: grpc.requestCallback<_inventory_v1_ReserveStockResponse__Output>): grpc.ClientUnaryCall;
  
}

export interface InventoryServiceHandlers extends grpc.UntypedServiceImplementation {
  ReleaseStock: grpc.handleUnaryCall<_inventory_v1_ReleaseStockRequest__Output, _inventory_v1_ReleaseStockResponse>;
  
  ReserveStock: grpc.handleUnaryCall<_inventory_v1_ReserveStockRequest__Output, _inventory_v1_ReserveStockResponse>;
  
}

export interface InventoryServiceDefinition extends grpc.ServiceDefinition {
  ReleaseStock: MethodDefinition<_inventory_v1_ReleaseStockRequest, _inventory_v1_ReleaseStockResponse, _inventory_v1_ReleaseStockRequest__Output, _inventory_v1_ReleaseStockResponse__Output>
  ReserveStock: MethodDefinition<_inventory_v1_ReserveStockRequest, _inventory_v1_ReserveStockResponse, _inventory_v1_ReserveStockRequest__Output, _inventory_v1_ReserveStockResponse__Output>
}
