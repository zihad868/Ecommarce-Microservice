// Original file: contracts/proto/order/v1/order.proto

import type { OrderItemInput as _order_v1_OrderItemInput, OrderItemInput__Output as _order_v1_OrderItemInput__Output } from '../../order/v1/OrderItemInput';

export interface CreateOrderRequest {
  'items'?: (_order_v1_OrderItemInput)[];
  'idempotencyKey'?: (string);
}

export interface CreateOrderRequest__Output {
  'items': (_order_v1_OrderItemInput__Output)[];
  'idempotencyKey': (string);
}
