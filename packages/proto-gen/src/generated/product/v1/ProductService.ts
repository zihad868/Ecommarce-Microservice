// Original file: contracts/proto/product/v1/product.proto

import type * as grpc from '@grpc/grpc-js'
import type { MethodDefinition } from '@grpc/proto-loader'
import type { ProductRequest as _product_v1_ProductRequest, ProductRequest__Output as _product_v1_ProductRequest__Output } from '../../product/v1/ProductRequest';
import type { ProductResponse as _product_v1_ProductResponse, ProductResponse__Output as _product_v1_ProductResponse__Output } from '../../product/v1/ProductResponse';

export interface ProductServiceClient extends grpc.Client {
  GetProduct(argument: _product_v1_ProductRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_product_v1_ProductResponse__Output>): grpc.ClientUnaryCall;
  GetProduct(argument: _product_v1_ProductRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_product_v1_ProductResponse__Output>): grpc.ClientUnaryCall;
  GetProduct(argument: _product_v1_ProductRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_product_v1_ProductResponse__Output>): grpc.ClientUnaryCall;
  GetProduct(argument: _product_v1_ProductRequest, callback: grpc.requestCallback<_product_v1_ProductResponse__Output>): grpc.ClientUnaryCall;
  getProduct(argument: _product_v1_ProductRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_product_v1_ProductResponse__Output>): grpc.ClientUnaryCall;
  getProduct(argument: _product_v1_ProductRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_product_v1_ProductResponse__Output>): grpc.ClientUnaryCall;
  getProduct(argument: _product_v1_ProductRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_product_v1_ProductResponse__Output>): grpc.ClientUnaryCall;
  getProduct(argument: _product_v1_ProductRequest, callback: grpc.requestCallback<_product_v1_ProductResponse__Output>): grpc.ClientUnaryCall;
  
}

export interface ProductServiceHandlers extends grpc.UntypedServiceImplementation {
  GetProduct: grpc.handleUnaryCall<_product_v1_ProductRequest__Output, _product_v1_ProductResponse>;
  
}

export interface ProductServiceDefinition extends grpc.ServiceDefinition {
  GetProduct: MethodDefinition<_product_v1_ProductRequest, _product_v1_ProductResponse, _product_v1_ProductRequest__Output, _product_v1_ProductResponse__Output>
}
