// Original file: contracts/events/order/v1/order_created.proto

import type { OrderItem as _events_order_v1_OrderItem, OrderItem__Output as _events_order_v1_OrderItem__Output } from '../../../events/order/v1/OrderItem';

export interface OrderCreated {
  'eventId'?: (string);
  'version'?: (number);
  'eventType'?: (string);
  'timestamp'?: (string);
  'orderId'?: (string);
  'userId'?: (string);
  'items'?: (_events_order_v1_OrderItem)[];
  'totalAmount'?: (number | string);
}

export interface OrderCreated__Output {
  'eventId': (string);
  'version': (number);
  'eventType': (string);
  'timestamp': (string);
  'orderId': (string);
  'userId': (string);
  'items': (_events_order_v1_OrderItem__Output)[];
  'totalAmount': (number);
}
