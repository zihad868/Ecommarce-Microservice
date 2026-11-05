// Original file: contracts/proto/order/v1/order.proto

import type * as grpc from '@grpc/grpc-js'
import type { MethodDefinition } from '@grpc/proto-loader'
import type { CreateOrderRequest as _order_v1_CreateOrderRequest, CreateOrderRequest__Output as _order_v1_CreateOrderRequest__Output } from '../../order/v1/CreateOrderRequest';
import type { OrderRequest as _order_v1_OrderRequest, OrderRequest__Output as _order_v1_OrderRequest__Output } from '../../order/v1/OrderRequest';
import type { OrderResponse as _order_v1_OrderResponse, OrderResponse__Output as _order_v1_OrderResponse__Output } from '../../order/v1/OrderResponse';
import type { PayOrderRequest as _order_v1_PayOrderRequest, PayOrderRequest__Output as _order_v1_PayOrderRequest__Output } from '../../order/v1/PayOrderRequest';
import type { ReconcileReservationResponse as _order_v1_ReconcileReservationResponse, ReconcileReservationResponse__Output as _order_v1_ReconcileReservationResponse__Output } from '../../order/v1/ReconcileReservationResponse';
import type { UpdateOrderStatusRequest as _order_v1_UpdateOrderStatusRequest, UpdateOrderStatusRequest__Output as _order_v1_UpdateOrderStatusRequest__Output } from '../../order/v1/UpdateOrderStatusRequest';
import type { UserOrdersRequest as _order_v1_UserOrdersRequest, UserOrdersRequest__Output as _order_v1_UserOrdersRequest__Output } from '../../order/v1/UserOrdersRequest';
import type { UserOrdersResponse as _order_v1_UserOrdersResponse, UserOrdersResponse__Output as _order_v1_UserOrdersResponse__Output } from '../../order/v1/UserOrdersResponse';

export interface OrderServiceClient extends grpc.Client {
  CreateOrder(argument: _order_v1_CreateOrderRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_order_v1_OrderResponse__Output>): grpc.ClientUnaryCall;
  CreateOrder(argument: _order_v1_CreateOrderRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_order_v1_OrderResponse__Output>): grpc.ClientUnaryCall;
  CreateOrder(argument: _order_v1_CreateOrderRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_order_v1_OrderResponse__Output>): grpc.ClientUnaryCall;
  CreateOrder(argument: _order_v1_CreateOrderRequest, callback: grpc.requestCallback<_order_v1_OrderResponse__Output>): grpc.ClientUnaryCall;
  createOrder(argument: _order_v1_CreateOrderRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_order_v1_OrderResponse__Output>): grpc.ClientUnaryCall;
  createOrder(argument: _order_v1_CreateOrderRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_order_v1_OrderResponse__Output>): grpc.ClientUnaryCall;
  createOrder(argument: _order_v1_CreateOrderRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_order_v1_OrderResponse__Output>): grpc.ClientUnaryCall;
  createOrder(argument: _order_v1_CreateOrderRequest, callback: grpc.requestCallback<_order_v1_OrderResponse__Output>): grpc.ClientUnaryCall;
  
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
  
  PayOrder(argument: _order_v1_PayOrderRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_order_v1_OrderResponse__Output>): grpc.ClientUnaryCall;
  PayOrder(argument: _order_v1_PayOrderRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_order_v1_OrderResponse__Output>): grpc.ClientUnaryCall;
  PayOrder(argument: _order_v1_PayOrderRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_order_v1_OrderResponse__Output>): grpc.ClientUnaryCall;
  PayOrder(argument: _order_v1_PayOrderRequest, callback: grpc.requestCallback<_order_v1_OrderResponse__Output>): grpc.ClientUnaryCall;
  payOrder(argument: _order_v1_PayOrderRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_order_v1_OrderResponse__Output>): grpc.ClientUnaryCall;
  payOrder(argument: _order_v1_PayOrderRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_order_v1_OrderResponse__Output>): grpc.ClientUnaryCall;
  payOrder(argument: _order_v1_PayOrderRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_order_v1_OrderResponse__Output>): grpc.ClientUnaryCall;
  payOrder(argument: _order_v1_PayOrderRequest, callback: grpc.requestCallback<_order_v1_OrderResponse__Output>): grpc.ClientUnaryCall;
  
  ReconcileReservation(argument: _order_v1_OrderRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_order_v1_ReconcileReservationResponse__Output>): grpc.ClientUnaryCall;
  ReconcileReservation(argument: _order_v1_OrderRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_order_v1_ReconcileReservationResponse__Output>): grpc.ClientUnaryCall;
  ReconcileReservation(argument: _order_v1_OrderRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_order_v1_ReconcileReservationResponse__Output>): grpc.ClientUnaryCall;
  ReconcileReservation(argument: _order_v1_OrderRequest, callback: grpc.requestCallback<_order_v1_ReconcileReservationResponse__Output>): grpc.ClientUnaryCall;
  reconcileReservation(argument: _order_v1_OrderRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_order_v1_ReconcileReservationResponse__Output>): grpc.ClientUnaryCall;
  reconcileReservation(argument: _order_v1_OrderRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_order_v1_ReconcileReservationResponse__Output>): grpc.ClientUnaryCall;
  reconcileReservation(argument: _order_v1_OrderRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_order_v1_ReconcileReservationResponse__Output>): grpc.ClientUnaryCall;
  reconcileReservation(argument: _order_v1_OrderRequest, callback: grpc.requestCallback<_order_v1_ReconcileReservationResponse__Output>): grpc.ClientUnaryCall;
  
  UpdateOrderStatus(argument: _order_v1_UpdateOrderStatusRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_order_v1_OrderResponse__Output>): grpc.ClientUnaryCall;
  UpdateOrderStatus(argument: _order_v1_UpdateOrderStatusRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_order_v1_OrderResponse__Output>): grpc.ClientUnaryCall;
  UpdateOrderStatus(argument: _order_v1_UpdateOrderStatusRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_order_v1_OrderResponse__Output>): grpc.ClientUnaryCall;
  UpdateOrderStatus(argument: _order_v1_UpdateOrderStatusRequest, callback: grpc.requestCallback<_order_v1_OrderResponse__Output>): grpc.ClientUnaryCall;
  updateOrderStatus(argument: _order_v1_UpdateOrderStatusRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_order_v1_OrderResponse__Output>): grpc.ClientUnaryCall;
  updateOrderStatus(argument: _order_v1_UpdateOrderStatusRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_order_v1_OrderResponse__Output>): grpc.ClientUnaryCall;
  updateOrderStatus(argument: _order_v1_UpdateOrderStatusRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_order_v1_OrderResponse__Output>): grpc.ClientUnaryCall;
  updateOrderStatus(argument: _order_v1_UpdateOrderStatusRequest, callback: grpc.requestCallback<_order_v1_OrderResponse__Output>): grpc.ClientUnaryCall;
  
}

export interface OrderServiceHandlers extends grpc.UntypedServiceImplementation {
  CreateOrder: grpc.handleUnaryCall<_order_v1_CreateOrderRequest__Output, _order_v1_OrderResponse>;
  
  GetOrder: grpc.handleUnaryCall<_order_v1_OrderRequest__Output, _order_v1_OrderResponse>;
  
  GetOrdersByUser: grpc.handleUnaryCall<_order_v1_UserOrdersRequest__Output, _order_v1_UserOrdersResponse>;
  
  PayOrder: grpc.handleUnaryCall<_order_v1_PayOrderRequest__Output, _order_v1_OrderResponse>;
  
  ReconcileReservation: grpc.handleUnaryCall<_order_v1_OrderRequest__Output, _order_v1_ReconcileReservationResponse>;
  
  UpdateOrderStatus: grpc.handleUnaryCall<_order_v1_UpdateOrderStatusRequest__Output, _order_v1_OrderResponse>;
  
}

export interface OrderServiceDefinition extends grpc.ServiceDefinition {
  CreateOrder: MethodDefinition<_order_v1_CreateOrderRequest, _order_v1_OrderResponse, _order_v1_CreateOrderRequest__Output, _order_v1_OrderResponse__Output>
  GetOrder: MethodDefinition<_order_v1_OrderRequest, _order_v1_OrderResponse, _order_v1_OrderRequest__Output, _order_v1_OrderResponse__Output>
  GetOrdersByUser: MethodDefinition<_order_v1_UserOrdersRequest, _order_v1_UserOrdersResponse, _order_v1_UserOrdersRequest__Output, _order_v1_UserOrdersResponse__Output>
  PayOrder: MethodDefinition<_order_v1_PayOrderRequest, _order_v1_OrderResponse, _order_v1_PayOrderRequest__Output, _order_v1_OrderResponse__Output>
  ReconcileReservation: MethodDefinition<_order_v1_OrderRequest, _order_v1_ReconcileReservationResponse, _order_v1_OrderRequest__Output, _order_v1_ReconcileReservationResponse__Output>
  UpdateOrderStatus: MethodDefinition<_order_v1_UpdateOrderStatusRequest, _order_v1_OrderResponse, _order_v1_UpdateOrderStatusRequest__Output, _order_v1_OrderResponse__Output>
}
