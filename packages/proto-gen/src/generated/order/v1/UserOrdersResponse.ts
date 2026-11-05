// Original file: contracts/proto/order/v1/order.proto

import type { OrderResponse as _order_v1_OrderResponse, OrderResponse__Output as _order_v1_OrderResponse__Output } from '../../order/v1/OrderResponse';

export interface UserOrdersResponse {
  'success'?: (boolean);
  'orders'?: (_order_v1_OrderResponse)[];
  'error'?: (string);
  'nextCursor'?: (string);
}

export interface UserOrdersResponse__Output {
  'success': (boolean);
  'orders': (_order_v1_OrderResponse__Output)[];
  'error': (string);
  'nextCursor': (string);
}
