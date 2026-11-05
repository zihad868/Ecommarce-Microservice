// Original file: contracts/proto/order/v2/order_v2.proto

import type { OrderStatus as _order_v2_OrderStatus, OrderStatus__Output as _order_v2_OrderStatus__Output } from '../../order/v2/OrderStatus';
import type { Money as _common_v1_Money, Money__Output as _common_v1_Money__Output } from '../../common/v1/Money';
import type { OrderItem as _order_v2_OrderItem, OrderItem__Output as _order_v2_OrderItem__Output } from '../../order/v2/OrderItem';

export interface Order {
  'id'?: (string);
  'userId'?: (string);
  'status'?: (_order_v2_OrderStatus);
  'total'?: (_common_v1_Money | null);
  'items'?: (_order_v2_OrderItem)[];
}

export interface Order__Output {
  'id': (string);
  'userId': (string);
  'status': (_order_v2_OrderStatus__Output);
  'total': (_common_v1_Money__Output | null);
  'items': (_order_v2_OrderItem__Output)[];
}
