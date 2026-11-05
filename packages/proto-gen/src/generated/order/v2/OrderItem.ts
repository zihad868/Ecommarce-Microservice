// Original file: contracts/proto/order/v2/order_v2.proto

import type { Money as _common_v1_Money, Money__Output as _common_v1_Money__Output } from '../../common/v1/Money';

export interface OrderItem {
  'productId'?: (string);
  'quantity'?: (number);
  'price'?: (_common_v1_Money | null);
}

export interface OrderItem__Output {
  'productId': (string);
  'quantity': (number);
  'price': (_common_v1_Money__Output | null);
}
