import type * as grpc from '@grpc/grpc-js';
import type { MessageTypeDefinition } from '@grpc/proto-loader';

import type { CreateOrderRequest as _order_v1_CreateOrderRequest, CreateOrderRequest__Output as _order_v1_CreateOrderRequest__Output } from './order/v1/CreateOrderRequest';
import type { OrderItemInput as _order_v1_OrderItemInput, OrderItemInput__Output as _order_v1_OrderItemInput__Output } from './order/v1/OrderItemInput';
import type { OrderRequest as _order_v1_OrderRequest, OrderRequest__Output as _order_v1_OrderRequest__Output } from './order/v1/OrderRequest';
import type { OrderResponse as _order_v1_OrderResponse, OrderResponse__Output as _order_v1_OrderResponse__Output } from './order/v1/OrderResponse';
import type { OrderServiceClient as _order_v1_OrderServiceClient, OrderServiceDefinition as _order_v1_OrderServiceDefinition } from './order/v1/OrderService';
import type { PayOrderRequest as _order_v1_PayOrderRequest, PayOrderRequest__Output as _order_v1_PayOrderRequest__Output } from './order/v1/PayOrderRequest';
import type { ReconcileReservationResponse as _order_v1_ReconcileReservationResponse, ReconcileReservationResponse__Output as _order_v1_ReconcileReservationResponse__Output } from './order/v1/ReconcileReservationResponse';
import type { UpdateOrderStatusRequest as _order_v1_UpdateOrderStatusRequest, UpdateOrderStatusRequest__Output as _order_v1_UpdateOrderStatusRequest__Output } from './order/v1/UpdateOrderStatusRequest';
import type { UserOrdersRequest as _order_v1_UserOrdersRequest, UserOrdersRequest__Output as _order_v1_UserOrdersRequest__Output } from './order/v1/UserOrdersRequest';
import type { UserOrdersResponse as _order_v1_UserOrdersResponse, UserOrdersResponse__Output as _order_v1_UserOrdersResponse__Output } from './order/v1/UserOrdersResponse';

type SubtypeConstructor<Constructor extends new (...args: any) => any, Subtype> = {
  new(...args: ConstructorParameters<Constructor>): Subtype;
};

export interface ProtoGrpcType {
  order: {
    v1: {
      CreateOrderRequest: MessageTypeDefinition<_order_v1_CreateOrderRequest, _order_v1_CreateOrderRequest__Output>
      OrderItemInput: MessageTypeDefinition<_order_v1_OrderItemInput, _order_v1_OrderItemInput__Output>
      OrderRequest: MessageTypeDefinition<_order_v1_OrderRequest, _order_v1_OrderRequest__Output>
      OrderResponse: MessageTypeDefinition<_order_v1_OrderResponse, _order_v1_OrderResponse__Output>
      OrderService: SubtypeConstructor<typeof grpc.Client, _order_v1_OrderServiceClient> & { service: _order_v1_OrderServiceDefinition }
      PayOrderRequest: MessageTypeDefinition<_order_v1_PayOrderRequest, _order_v1_PayOrderRequest__Output>
      ReconcileReservationResponse: MessageTypeDefinition<_order_v1_ReconcileReservationResponse, _order_v1_ReconcileReservationResponse__Output>
      UpdateOrderStatusRequest: MessageTypeDefinition<_order_v1_UpdateOrderStatusRequest, _order_v1_UpdateOrderStatusRequest__Output>
      UserOrdersRequest: MessageTypeDefinition<_order_v1_UserOrdersRequest, _order_v1_UserOrdersRequest__Output>
      UserOrdersResponse: MessageTypeDefinition<_order_v1_UserOrdersResponse, _order_v1_UserOrdersResponse__Output>
    }
  }
}

