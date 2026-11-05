// Original file: contracts/proto/order/v2/order_v2.proto

import type { OrderItemInput as _order_v2_OrderItemInput, OrderItemInput__Output as _order_v2_OrderItemInput__Output } from '../../order/v2/OrderItemInput';

export interface CreateOrderRequest {
  'items'?: (_order_v2_OrderItemInput)[];
  'idempotencyKey'?: (string);
}

export interface CreateOrderRequest__Output {
  'items': (_order_v2_OrderItemInput__Output)[];
  'idempotencyKey': (string);
}
