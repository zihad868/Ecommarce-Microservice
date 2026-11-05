import type * as grpc from '@grpc/grpc-js';
import type { EnumTypeDefinition, MessageTypeDefinition } from '@grpc/proto-loader';

import type { EventMetadata as _common_v1_EventMetadata, EventMetadata__Output as _common_v1_EventMetadata__Output } from './common/v1/EventMetadata';
import type { Money as _common_v1_Money, Money__Output as _common_v1_Money__Output } from './common/v1/Money';
import type { CreateOrderRequest as _order_v2_CreateOrderRequest, CreateOrderRequest__Output as _order_v2_CreateOrderRequest__Output } from './order/v2/CreateOrderRequest';
import type { Order as _order_v2_Order, Order__Output as _order_v2_Order__Output } from './order/v2/Order';
import type { OrderItem as _order_v2_OrderItem, OrderItem__Output as _order_v2_OrderItem__Output } from './order/v2/OrderItem';
import type { OrderItemInput as _order_v2_OrderItemInput, OrderItemInput__Output as _order_v2_OrderItemInput__Output } from './order/v2/OrderItemInput';
import type { OrderRequest as _order_v2_OrderRequest, OrderRequest__Output as _order_v2_OrderRequest__Output } from './order/v2/OrderRequest';
import type { OrderServiceClient as _order_v2_OrderServiceClient, OrderServiceDefinition as _order_v2_OrderServiceDefinition } from './order/v2/OrderService';
import type { PayOrderRequest as _order_v2_PayOrderRequest, PayOrderRequest__Output as _order_v2_PayOrderRequest__Output } from './order/v2/PayOrderRequest';
import type { ReconcileReservationResponse as _order_v2_ReconcileReservationResponse, ReconcileReservationResponse__Output as _order_v2_ReconcileReservationResponse__Output } from './order/v2/ReconcileReservationResponse';
import type { UpdateOrderStatusRequest as _order_v2_UpdateOrderStatusRequest, UpdateOrderStatusRequest__Output as _order_v2_UpdateOrderStatusRequest__Output } from './order/v2/UpdateOrderStatusRequest';
import type { UserOrdersRequest as _order_v2_UserOrdersRequest, UserOrdersRequest__Output as _order_v2_UserOrdersRequest__Output } from './order/v2/UserOrdersRequest';
import type { UserOrdersResponse as _order_v2_UserOrdersResponse, UserOrdersResponse__Output as _order_v2_UserOrdersResponse__Output } from './order/v2/UserOrdersResponse';

type SubtypeConstructor<Constructor extends new (...args: any) => any, Subtype> = {
  new(...args: ConstructorParameters<Constructor>): Subtype;
};

export interface ProtoGrpcType {
  common: {
    v1: {
      EventMetadata: MessageTypeDefinition<_common_v1_EventMetadata, _common_v1_EventMetadata__Output>
      Money: MessageTypeDefinition<_common_v1_Money, _common_v1_Money__Output>
    }
  }
  order: {
    v2: {
      CreateOrderRequest: MessageTypeDefinition<_order_v2_CreateOrderRequest, _order_v2_CreateOrderRequest__Output>
      Order: MessageTypeDefinition<_order_v2_Order, _order_v2_Order__Output>
      OrderItem: MessageTypeDefinition<_order_v2_OrderItem, _order_v2_OrderItem__Output>
      OrderItemInput: MessageTypeDefinition<_order_v2_OrderItemInput, _order_v2_OrderItemInput__Output>
      OrderRequest: MessageTypeDefinition<_order_v2_OrderRequest, _order_v2_OrderRequest__Output>
      OrderService: SubtypeConstructor<typeof grpc.Client, _order_v2_OrderServiceClient> & { service: _order_v2_OrderServiceDefinition }
      OrderStatus: EnumTypeDefinition
      PayOrderRequest: MessageTypeDefinition<_order_v2_PayOrderRequest, _order_v2_PayOrderRequest__Output>
      ReconcileReservationResponse: MessageTypeDefinition<_order_v2_ReconcileReservationResponse, _order_v2_ReconcileReservationResponse__Output>
      UpdateOrderStatusRequest: MessageTypeDefinition<_order_v2_UpdateOrderStatusRequest, _order_v2_UpdateOrderStatusRequest__Output>
      UserOrdersRequest: MessageTypeDefinition<_order_v2_UserOrdersRequest, _order_v2_UserOrdersRequest__Output>
      UserOrdersResponse: MessageTypeDefinition<_order_v2_UserOrdersResponse, _order_v2_UserOrdersResponse__Output>
    }
  }
}

