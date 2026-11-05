// Original file: contracts/proto/order/v1/order.proto

import type * as grpc from '@grpc/grpc-js'
import type { MethodDefinition } from '@grpc/proto-loader'
import type { OrderRequest as _order_v1_OrderRequest, OrderRequest__Output as _order_v1_OrderRequest__Output } from '../../order/v1/OrderRequest';
import type { OrderResponse as _order_v1_OrderResponse, OrderResponse__Output as _order_v1_OrderResponse__Output } from '../../order/v1/OrderResponse';
import type { UserOrdersRequest as _order_v1_UserOrdersRequest, UserOrdersRequest__Output as _order_v1_UserOrdersRequest__Output } from '../../order/v1/UserOrdersRequest';
import type { UserOrdersResponse as _order_v1_UserOrdersResponse, UserOrdersResponse__Output as _order_v1_UserOrdersResponse__Output } from '../../order/v1/UserOrdersResponse';

export interface OrderServiceClient extends grpc.Client {
  GetOrder(argument: _order_v1_OrderRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_order_v1_OrderResponse__Output>): grpc.ClientUnaryCall;
  GetOrder(argument: _order_v1_OrderRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_order_v1_OrderResponse__Output>): grpc.ClientUnaryCall;
  GetOrder(argument: _order_v1_OrderRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_order_v1_OrderResponse__Output>): grpc.ClientUnaryCall;
  GetOrder(argument: _order_v1_OrderRequest, callback: grpc.requestCallback<_order_v1_OrderResponse__Output>): grpc.ClientUnaryCall;
  getOrder(argument: _order_v1_OrderRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_order_v1_OrderResponse__Output>): grpc.ClientUnaryCall;
  getOrder(argument: _order_v1_OrderRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_order_v1_OrderResponse__Output>): grpc.ClientUnaryCall;
  getOrder(argument: _order_v1_OrderRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_order_v1_OrderResponse__Output>): grpc.ClientUnaryCall;
  getOrder(argument: _order_v1_OrderRequest, callback: grpc.requestCallback<_order_v1_OrderResponse__Output>): grpc.ClientUnaryCall;
  
  GetOrdersByUser(argument: _order_v1_UserOrdersRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_order_v1_UserOrdersResponse__Output>): grpc.ClientUnaryCall;
  GetOrdersByUser(argument: _order_v1_UserOrdersRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_order_v1_UserOrdersResponse__Output>): grpc.ClientUnaryCall;
  GetOrdersByUser(argument: _order_v1_UserOrdersRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_order_v1_UserOrdersResponse__Output>): grpc.ClientUnaryCall;
  GetOrdersByUser(argument: _order_v1_UserOrdersRequest, callback: grpc.requestCallback<_order_v1_UserOrdersResponse__Output>): grpc.ClientUnaryCall;
  getOrdersByUser(argument: _order_v1_UserOrdersRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_order_v1_UserOrdersResponse__Output>): grpc.ClientUnaryCall;
  getOrdersByUser(argument: _order_v1_UserOrdersRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_order_v1_UserOrdersResponse__Output>): grpc.ClientUnaryCall;
  getOrdersByUser(argument: _order_v1_UserOrdersRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_order_v1_UserOrdersResponse__Output>): grpc.ClientUnaryCall;
  getOrdersByUser(argument: _order_v1_UserOrdersRequest, callback: grpc.requestCallback<_order_v1_UserOrdersResponse__Output>): grpc.ClientUnaryCall;
  
}

export interface OrderServiceHandlers extends grpc.UntypedServiceImplementation {
  GetOrder: grpc.handleUnaryCall<_order_v1_OrderRequest__Output, _order_v1_OrderResponse>;
  
  GetOrdersByUser: grpc.handleUnaryCall<_order_v1_UserOrdersRequest__Output, _order_v1_UserOrdersResponse>;
  
}

export interface OrderServiceDefinition extends grpc.ServiceDefinition {
  GetOrder: MethodDefinition<_order_v1_OrderRequest, _order_v1_OrderResponse, _order_v1_OrderRequest__Output, _order_v1_OrderResponse__Output>
  GetOrdersByUser: MethodDefinition<_order_v1_UserOrdersRequest, _order_v1_UserOrdersResponse, _order_v1_UserOrdersRequest__Output, _order_v1_UserOrdersResponse__Output>
}
