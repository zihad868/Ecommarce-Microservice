// Original file: contracts/proto/order/v2/order_v2.proto

import type { Order as _order_v2_Order, Order__Output as _order_v2_Order__Output } from '../../order/v2/Order';

export interface UserOrdersResponse {
  'orders'?: (_order_v2_Order)[];
  'nextCursor'?: (string);
}

export interface UserOrdersResponse__Output {
  'orders': (_order_v2_Order__Output)[];
  'nextCursor': (string);
}
