// Original file: contracts/proto/product/v1/product.proto

import type * as grpc from '@grpc/grpc-js'
import type { MethodDefinition } from '@grpc/proto-loader'
import type { ListProductsRequest as _product_v1_ListProductsRequest, ListProductsRequest__Output as _product_v1_ListProductsRequest__Output } from '../../product/v1/ListProductsRequest';
import type { ListProductsResponse as _product_v1_ListProductsResponse, ListProductsResponse__Output as _product_v1_ListProductsResponse__Output } from '../../product/v1/ListProductsResponse';
import type { Product as _product_v1_Product, Product__Output as _product_v1_Product__Output } from '../../product/v1/Product';
import type { ProductMutationRequest as _product_v1_ProductMutationRequest, ProductMutationRequest__Output as _product_v1_ProductMutationRequest__Output } from '../../product/v1/ProductMutationRequest';
import type { ProductRequest as _product_v1_ProductRequest, ProductRequest__Output as _product_v1_ProductRequest__Output } from '../../product/v1/ProductRequest';
import type { ReleaseStockRequest as _product_v1_ReleaseStockRequest, ReleaseStockRequest__Output as _product_v1_ReleaseStockRequest__Output } from '../../product/v1/ReleaseStockRequest';
import type { ReleaseStockResponse as _product_v1_ReleaseStockResponse, ReleaseStockResponse__Output as _product_v1_ReleaseStockResponse__Output } from '../../product/v1/ReleaseStockResponse';
import type { ReserveStockRequest as _product_v1_ReserveStockRequest, ReserveStockRequest__Output as _product_v1_ReserveStockRequest__Output } from '../../product/v1/ReserveStockRequest';
import type { ReserveStockResponse as _product_v1_ReserveStockResponse, ReserveStockResponse__Output as _product_v1_ReserveStockResponse__Output } from '../../product/v1/ReserveStockResponse';

export interface ProductServiceClient extends grpc.Client {
  CreateProduct(argument: _product_v1_ProductMutationRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_product_v1_Product__Output>): grpc.ClientUnaryCall;
  CreateProduct(argument: _product_v1_ProductMutationRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_product_v1_Product__Output>): grpc.ClientUnaryCall;
  CreateProduct(argument: _product_v1_ProductMutationRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_product_v1_Product__Output>): grpc.ClientUnaryCall;
  CreateProduct(argument: _product_v1_ProductMutationRequest, callback: grpc.requestCallback<_product_v1_Product__Output>): grpc.ClientUnaryCall;
  createProduct(argument: _product_v1_ProductMutationRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_product_v1_Product__Output>): grpc.ClientUnaryCall;
  createProduct(argument: _product_v1_ProductMutationRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_product_v1_Product__Output>): grpc.ClientUnaryCall;
  createProduct(argument: _product_v1_ProductMutationRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_product_v1_Product__Output>): grpc.ClientUnaryCall;
  createProduct(argument: _product_v1_ProductMutationRequest, callback: grpc.requestCallback<_product_v1_Product__Output>): grpc.ClientUnaryCall;
  
  DeleteProduct(argument: _product_v1_ProductRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_product_v1_ReleaseStockResponse__Output>): grpc.ClientUnaryCall;
  DeleteProduct(argument: _product_v1_ProductRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_product_v1_ReleaseStockResponse__Output>): grpc.ClientUnaryCall;
  DeleteProduct(argument: _product_v1_ProductRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_product_v1_ReleaseStockResponse__Output>): grpc.ClientUnaryCall;
  DeleteProduct(argument: _product_v1_ProductRequest, callback: grpc.requestCallback<_product_v1_ReleaseStockResponse__Output>): grpc.ClientUnaryCall;
  deleteProduct(argument: _product_v1_ProductRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_product_v1_ReleaseStockResponse__Output>): grpc.ClientUnaryCall;
  deleteProduct(argument: _product_v1_ProductRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_product_v1_ReleaseStockResponse__Output>): grpc.ClientUnaryCall;
  deleteProduct(argument: _product_v1_ProductRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_product_v1_ReleaseStockResponse__Output>): grpc.ClientUnaryCall;
  deleteProduct(argument: _product_v1_ProductRequest, callback: grpc.requestCallback<_product_v1_ReleaseStockResponse__Output>): grpc.ClientUnaryCall;
  
  GetProduct(argument: _product_v1_ProductRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_product_v1_Product__Output>): grpc.ClientUnaryCall;
  GetProduct(argument: _product_v1_ProductRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_product_v1_Product__Output>): grpc.ClientUnaryCall;
  GetProduct(argument: _product_v1_ProductRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_product_v1_Product__Output>): grpc.ClientUnaryCall;
  GetProduct(argument: _product_v1_ProductRequest, callback: grpc.requestCallback<_product_v1_Product__Output>): grpc.ClientUnaryCall;
  getProduct(argument: _product_v1_ProductRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_product_v1_Product__Output>): grpc.ClientUnaryCall;
  getProduct(argument: _product_v1_ProductRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_product_v1_Product__Output>): grpc.ClientUnaryCall;
  getProduct(argument: _product_v1_ProductRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_product_v1_Product__Output>): grpc.ClientUnaryCall;
  getProduct(argument: _product_v1_ProductRequest, callback: grpc.requestCallback<_product_v1_Product__Output>): grpc.ClientUnaryCall;
  
  ListProducts(argument: _product_v1_ListProductsRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_product_v1_ListProductsResponse__Output>): grpc.ClientUnaryCall;
  ListProducts(argument: _product_v1_ListProductsRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_product_v1_ListProductsResponse__Output>): grpc.ClientUnaryCall;
  ListProducts(argument: _product_v1_ListProductsRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_product_v1_ListProductsResponse__Output>): grpc.ClientUnaryCall;
  ListProducts(argument: _product_v1_ListProductsRequest, callback: grpc.requestCallback<_product_v1_ListProductsResponse__Output>): grpc.ClientUnaryCall;
  listProducts(argument: _product_v1_ListProductsRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_product_v1_ListProductsResponse__Output>): grpc.ClientUnaryCall;
  listProducts(argument: _product_v1_ListProductsRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_product_v1_ListProductsResponse__Output>): grpc.ClientUnaryCall;
  listProducts(argument: _product_v1_ListProductsRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_product_v1_ListProductsResponse__Output>): grpc.ClientUnaryCall;
  listProducts(argument: _product_v1_ListProductsRequest, callback: grpc.requestCallback<_product_v1_ListProductsResponse__Output>): grpc.ClientUnaryCall;
  
  ReleaseStock(argument: _product_v1_ReleaseStockRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_product_v1_ReleaseStockResponse__Output>): grpc.ClientUnaryCall;
  ReleaseStock(argument: _product_v1_ReleaseStockRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_product_v1_ReleaseStockResponse__Output>): grpc.ClientUnaryCall;
  ReleaseStock(argument: _product_v1_ReleaseStockRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_product_v1_ReleaseStockResponse__Output>): grpc.ClientUnaryCall;
  ReleaseStock(argument: _product_v1_ReleaseStockRequest, callback: grpc.requestCallback<_product_v1_ReleaseStockResponse__Output>): grpc.ClientUnaryCall;
  releaseStock(argument: _product_v1_ReleaseStockRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_product_v1_ReleaseStockResponse__Output>): grpc.ClientUnaryCall;
  releaseStock(argument: _product_v1_ReleaseStockRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_product_v1_ReleaseStockResponse__Output>): grpc.ClientUnaryCall;
  releaseStock(argument: _product_v1_ReleaseStockRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_product_v1_ReleaseStockResponse__Output>): grpc.ClientUnaryCall;
  releaseStock(argument: _product_v1_ReleaseStockRequest, callback: grpc.requestCallback<_product_v1_ReleaseStockResponse__Output>): grpc.ClientUnaryCall;
  
  ReserveStock(argument: _product_v1_ReserveStockRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_product_v1_ReserveStockResponse__Output>): grpc.ClientUnaryCall;
  ReserveStock(argument: _product_v1_ReserveStockRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_product_v1_ReserveStockResponse__Output>): grpc.ClientUnaryCall;
  ReserveStock(argument: _product_v1_ReserveStockRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_product_v1_ReserveStockResponse__Output>): grpc.ClientUnaryCall;
  ReserveStock(argument: _product_v1_ReserveStockRequest, callback: grpc.requestCallback<_product_v1_ReserveStockResponse__Output>): grpc.ClientUnaryCall;
  reserveStock(argument: _product_v1_ReserveStockRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_product_v1_ReserveStockResponse__Output>): grpc.ClientUnaryCall;
  reserveStock(argument: _product_v1_ReserveStockRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_product_v1_ReserveStockResponse__Output>): grpc.ClientUnaryCall;
  reserveStock(argument: _product_v1_ReserveStockRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_product_v1_ReserveStockResponse__Output>): grpc.ClientUnaryCall;
  reserveStock(argument: _product_v1_ReserveStockRequest, callback: grpc.requestCallback<_product_v1_ReserveStockResponse__Output>): grpc.ClientUnaryCall;
  
  UpdateProduct(argument: _product_v1_ProductMutationRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_product_v1_Product__Output>): grpc.ClientUnaryCall;
  UpdateProduct(argument: _product_v1_ProductMutationRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_product_v1_Product__Output>): grpc.ClientUnaryCall;
  UpdateProduct(argument: _product_v1_ProductMutationRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_product_v1_Product__Output>): grpc.ClientUnaryCall;
  UpdateProduct(argument: _product_v1_ProductMutationRequest, callback: grpc.requestCallback<_product_v1_Product__Output>): grpc.ClientUnaryCall;
  updateProduct(argument: _product_v1_ProductMutationRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_product_v1_Product__Output>): grpc.ClientUnaryCall;
  updateProduct(argument: _product_v1_ProductMutationRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_product_v1_Product__Output>): grpc.ClientUnaryCall;
  updateProduct(argument: _product_v1_ProductMutationRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_product_v1_Product__Output>): grpc.ClientUnaryCall;
  updateProduct(argument: _product_v1_ProductMutationRequest, callback: grpc.requestCallback<_product_v1_Product__Output>): grpc.ClientUnaryCall;
  
}

export interface ProductServiceHandlers extends grpc.UntypedServiceImplementation {
  CreateProduct: grpc.handleUnaryCall<_product_v1_ProductMutationRequest__Output, _product_v1_Product>;
  
  DeleteProduct: grpc.handleUnaryCall<_product_v1_ProductRequest__Output, _product_v1_ReleaseStockResponse>;
  
  GetProduct: grpc.handleUnaryCall<_product_v1_ProductRequest__Output, _product_v1_Product>;
  
  ListProducts: grpc.handleUnaryCall<_product_v1_ListProductsRequest__Output, _product_v1_ListProductsResponse>;
  
  ReleaseStock: grpc.handleUnaryCall<_product_v1_ReleaseStockRequest__Output, _product_v1_ReleaseStockResponse>;
  
  ReserveStock: grpc.handleUnaryCall<_product_v1_ReserveStockRequest__Output, _product_v1_ReserveStockResponse>;
  
  UpdateProduct: grpc.handleUnaryCall<_product_v1_ProductMutationRequest__Output, _product_v1_Product>;
  
}

export interface ProductServiceDefinition extends grpc.ServiceDefinition {
  CreateProduct: MethodDefinition<_product_v1_ProductMutationRequest, _product_v1_Product, _product_v1_ProductMutationRequest__Output, _product_v1_Product__Output>
  DeleteProduct: MethodDefinition<_product_v1_ProductRequest, _product_v1_ReleaseStockResponse, _product_v1_ProductRequest__Output, _product_v1_ReleaseStockResponse__Output>
  GetProduct: MethodDefinition<_product_v1_ProductRequest, _product_v1_Product, _product_v1_ProductRequest__Output, _product_v1_Product__Output>
  ListProducts: MethodDefinition<_product_v1_ListProductsRequest, _product_v1_ListProductsResponse, _product_v1_ListProductsRequest__Output, _product_v1_ListProductsResponse__Output>
  ReleaseStock: MethodDefinition<_product_v1_ReleaseStockRequest, _product_v1_ReleaseStockResponse, _product_v1_ReleaseStockRequest__Output, _product_v1_ReleaseStockResponse__Output>
  ReserveStock: MethodDefinition<_product_v1_ReserveStockRequest, _product_v1_ReserveStockResponse, _product_v1_ReserveStockRequest__Output, _product_v1_ReserveStockResponse__Output>
  UpdateProduct: MethodDefinition<_product_v1_ProductMutationRequest, _product_v1_Product, _product_v1_ProductMutationRequest__Output, _product_v1_Product__Output>
}
