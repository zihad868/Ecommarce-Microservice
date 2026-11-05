// Original file: contracts/proto/order/v2/order_v2.proto

import type { OrderStatus as _order_v2_OrderStatus, OrderStatus__Output as _order_v2_OrderStatus__Output } from '../../order/v2/OrderStatus';

export interface UpdateOrderStatusRequest {
  'orderId'?: (string);
  'status'?: (_order_v2_OrderStatus);
}

export interface UpdateOrderStatusRequest__Output {
  'orderId': (string);
  'status': (_order_v2_OrderStatus__Output);
}
