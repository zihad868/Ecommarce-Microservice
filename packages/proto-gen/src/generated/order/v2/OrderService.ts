// Original file: contracts/proto/order/v2/order_v2.proto

import type * as grpc from '@grpc/grpc-js'
import type { MethodDefinition } from '@grpc/proto-loader'
import type { CreateOrderRequest as _order_v2_CreateOrderRequest, CreateOrderRequest__Output as _order_v2_CreateOrderRequest__Output } from '../../order/v2/CreateOrderRequest';
import type { Order as _order_v2_Order, Order__Output as _order_v2_Order__Output } from '../../order/v2/Order';
import type { OrderRequest as _order_v2_OrderRequest, OrderRequest__Output as _order_v2_OrderRequest__Output } from '../../order/v2/OrderRequest';
import type { PayOrderRequest as _order_v2_PayOrderRequest, PayOrderRequest__Output as _order_v2_PayOrderRequest__Output } from '../../order/v2/PayOrderRequest';
import type { ReconcileReservationResponse as _order_v2_ReconcileReservationResponse, ReconcileReservationResponse__Output as _order_v2_ReconcileReservationResponse__Output } from '../../order/v2/ReconcileReservationResponse';
import type { UpdateOrderStatusRequest as _order_v2_UpdateOrderStatusRequest, UpdateOrderStatusRequest__Output as _order_v2_UpdateOrderStatusRequest__Output } from '../../order/v2/UpdateOrderStatusRequest';
import type { UserOrdersRequest as _order_v2_UserOrdersRequest, UserOrdersRequest__Output as _order_v2_UserOrdersRequest__Output } from '../../order/v2/UserOrdersRequest';
import type { UserOrdersResponse as _order_v2_UserOrdersResponse, UserOrdersResponse__Output as _order_v2_UserOrdersResponse__Output } from '../../order/v2/UserOrdersResponse';

export interface OrderServiceClient extends grpc.Client {
  CreateOrder(argument: _order_v2_CreateOrderRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_order_v2_Order__Output>): grpc.ClientUnaryCall;
  CreateOrder(argument: _order_v2_CreateOrderRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_order_v2_Order__Output>): grpc.ClientUnaryCall;
  CreateOrder(argument: _order_v2_CreateOrderRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_order_v2_Order__Output>): grpc.ClientUnaryCall;
  CreateOrder(argument: _order_v2_CreateOrderRequest, callback: grpc.requestCallback<_order_v2_Order__Output>): grpc.ClientUnaryCall;
  createOrder(argument: _order_v2_CreateOrderRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_order_v2_Order__Output>): grpc.ClientUnaryCall;
  createOrder(argument: _order_v2_CreateOrderRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_order_v2_Order__Output>): grpc.ClientUnaryCall;
  createOrder(argument: _order_v2_CreateOrderRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_order_v2_Order__Output>): grpc.ClientUnaryCall;
  createOrder(argument: _order_v2_CreateOrderRequest, callback: grpc.requestCallback<_order_v2_Order__Output>): grpc.ClientUnaryCall;
  
  GetOrder(argument: _order_v2_OrderRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_order_v2_Order__Output>): grpc.ClientUnaryCall;
  GetOrder(argument: _order_v2_OrderRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_order_v2_Order__Output>): grpc.ClientUnaryCall;
  GetOrder(argument: _order_v2_OrderRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_order_v2_Order__Output>): grpc.ClientUnaryCall;
  GetOrder(argument: _order_v2_OrderRequest, callback: grpc.requestCallback<_order_v2_Order__Output>): grpc.ClientUnaryCall;
  getOrder(argument: _order_v2_OrderRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_order_v2_Order__Output>): grpc.ClientUnaryCall;
  getOrder(argument: _order_v2_OrderRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_order_v2_Order__Output>): grpc.ClientUnaryCall;
  getOrder(argument: _order_v2_OrderRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_order_v2_Order__Output>): grpc.ClientUnaryCall;
  getOrder(argument: _order_v2_OrderRequest, callback: grpc.requestCallback<_order_v2_Order__Output>): grpc.ClientUnaryCall;
  
  GetOrdersByUser(argument: _order_v2_UserOrdersRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_order_v2_UserOrdersResponse__Output>): grpc.ClientUnaryCall;
  GetOrdersByUser(argument: _order_v2_UserOrdersRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_order_v2_UserOrdersResponse__Output>): grpc.ClientUnaryCall;
  GetOrdersByUser(argument: _order_v2_UserOrdersRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_order_v2_UserOrdersResponse__Output>): grpc.ClientUnaryCall;
  GetOrdersByUser(argument: _order_v2_UserOrdersRequest, callback: grpc.requestCallback<_order_v2_UserOrdersResponse__Output>): grpc.ClientUnaryCall;
  getOrdersByUser(argument: _order_v2_UserOrdersRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_order_v2_UserOrdersResponse__Output>): grpc.ClientUnaryCall;
  getOrdersByUser(argument: _order_v2_UserOrdersRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_order_v2_UserOrdersResponse__Output>): grpc.ClientUnaryCall;
  getOrdersByUser(argument: _order_v2_UserOrdersRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_order_v2_UserOrdersResponse__Output>): grpc.ClientUnaryCall;
  getOrdersByUser(argument: _order_v2_UserOrdersRequest, callback: grpc.requestCallback<_order_v2_UserOrdersResponse__Output>): grpc.ClientUnaryCall;
  
  PayOrder(argument: _order_v2_PayOrderRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_order_v2_Order__Output>): grpc.ClientUnaryCall;
  PayOrder(argument: _order_v2_PayOrderRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_order_v2_Order__Output>): grpc.ClientUnaryCall;
  PayOrder(argument: _order_v2_PayOrderRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_order_v2_Order__Output>): grpc.ClientUnaryCall;
  PayOrder(argument: _order_v2_PayOrderRequest, callback: grpc.requestCallback<_order_v2_Order__Output>): grpc.ClientUnaryCall;
  payOrder(argument: _order_v2_PayOrderRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_order_v2_Order__Output>): grpc.ClientUnaryCall;
  payOrder(argument: _order_v2_PayOrderRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_order_v2_Order__Output>): grpc.ClientUnaryCall;
  payOrder(argument: _order_v2_PayOrderRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_order_v2_Order__Output>): grpc.ClientUnaryCall;
  payOrder(argument: _order_v2_PayOrderRequest, callback: grpc.requestCallback<_order_v2_Order__Output>): grpc.ClientUnaryCall;
  
  ReconcileReservation(argument: _order_v2_OrderRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_order_v2_ReconcileReservationResponse__Output>): grpc.ClientUnaryCall;
  ReconcileReservation(argument: _order_v2_OrderRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_order_v2_ReconcileReservationResponse__Output>): grpc.ClientUnaryCall;
  ReconcileReservation(argument: _order_v2_OrderRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_order_v2_ReconcileReservationResponse__Output>): grpc.ClientUnaryCall;
  ReconcileReservation(argument: _order_v2_OrderRequest, callback: grpc.requestCallback<_order_v2_ReconcileReservationResponse__Output>): grpc.ClientUnaryCall;
  reconcileReservation(argument: _order_v2_OrderRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_order_v2_ReconcileReservationResponse__Output>): grpc.ClientUnaryCall;
  reconcileReservation(argument: _order_v2_OrderRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_order_v2_ReconcileReservationResponse__Output>): grpc.ClientUnaryCall;
  reconcileReservation(argument: _order_v2_OrderRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_order_v2_ReconcileReservationResponse__Output>): grpc.ClientUnaryCall;
  reconcileReservation(argument: _order_v2_OrderRequest, callback: grpc.requestCallback<_order_v2_ReconcileReservationResponse__Output>): grpc.ClientUnaryCall;
  
  UpdateOrderStatus(argument: _order_v2_UpdateOrderStatusRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_order_v2_Order__Output>): grpc.ClientUnaryCall;
  UpdateOrderStatus(argument: _order_v2_UpdateOrderStatusRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_order_v2_Order__Output>): grpc.ClientUnaryCall;
  UpdateOrderStatus(argument: _order_v2_UpdateOrderStatusRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_order_v2_Order__Output>): grpc.ClientUnaryCall;
  UpdateOrderStatus(argument: _order_v2_UpdateOrderStatusRequest, callback: grpc.requestCallback<_order_v2_Order__Output>): grpc.ClientUnaryCall;
  updateOrderStatus(argument: _order_v2_UpdateOrderStatusRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_order_v2_Order__Output>): grpc.ClientUnaryCall;
  updateOrderStatus(argument: _order_v2_UpdateOrderStatusRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_order_v2_Order__Output>): grpc.ClientUnaryCall;
  updateOrderStatus(argument: _order_v2_UpdateOrderStatusRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_order_v2_Order__Output>): grpc.ClientUnaryCall;
  updateOrderStatus(argument: _order_v2_UpdateOrderStatusRequest, callback: grpc.requestCallback<_order_v2_Order__Output>): grpc.ClientUnaryCall;
  
}

export interface OrderServiceHandlers extends grpc.UntypedServiceImplementation {
  CreateOrder: grpc.handleUnaryCall<_order_v2_CreateOrderRequest__Output, _order_v2_Order>;
  
  GetOrder: grpc.handleUnaryCall<_order_v2_OrderRequest__Output, _order_v2_Order>;
  
  GetOrdersByUser: grpc.handleUnaryCall<_order_v2_UserOrdersRequest__Output, _order_v2_UserOrdersResponse>;
  
  PayOrder: grpc.handleUnaryCall<_order_v2_PayOrderRequest__Output, _order_v2_Order>;
  
  ReconcileReservation: grpc.handleUnaryCall<_order_v2_OrderRequest__Output, _order_v2_ReconcileReservationResponse>;
  
  UpdateOrderStatus: grpc.handleUnaryCall<_order_v2_UpdateOrderStatusRequest__Output, _order_v2_Order>;
  
}

export interface OrderServiceDefinition extends grpc.ServiceDefinition {
  CreateOrder: MethodDefinition<_order_v2_CreateOrderRequest, _order_v2_Order, _order_v2_CreateOrderRequest__Output, _order_v2_Order__Output>
  GetOrder: MethodDefinition<_order_v2_OrderRequest, _order_v2_Order, _order_v2_OrderRequest__Output, _order_v2_Order__Output>
  GetOrdersByUser: MethodDefinition<_order_v2_UserOrdersRequest, _order_v2_UserOrdersResponse, _order_v2_UserOrdersRequest__Output, _order_v2_UserOrdersResponse__Output>
  PayOrder: MethodDefinition<_order_v2_PayOrderRequest, _order_v2_Order, _order_v2_PayOrderRequest__Output, _order_v2_Order__Output>
  ReconcileReservation: MethodDefinition<_order_v2_OrderRequest, _order_v2_ReconcileReservationResponse, _order_v2_OrderRequest__Output, _order_v2_ReconcileReservationResponse__Output>
  UpdateOrderStatus: MethodDefinition<_order_v2_UpdateOrderStatusRequest, _order_v2_Order, _order_v2_UpdateOrderStatusRequest__Output, _order_v2_Order__Output>
}
