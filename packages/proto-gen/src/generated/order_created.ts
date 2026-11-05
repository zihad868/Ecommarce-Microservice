import type * as grpc from '@grpc/grpc-js';
import type { MessageTypeDefinition } from '@grpc/proto-loader';

import type { OrderCreated as _events_order_v1_OrderCreated, OrderCreated__Output as _events_order_v1_OrderCreated__Output } from './events/order/v1/OrderCreated';
import type { OrderItem as _events_order_v1_OrderItem, OrderItem__Output as _events_order_v1_OrderItem__Output } from './events/order/v1/OrderItem';

type SubtypeConstructor<Constructor extends new (...args: any) => any, Subtype> = {
  new(...args: ConstructorParameters<Constructor>): Subtype;
};

export interface ProtoGrpcType {
  events: {
    order: {
      v1: {
        OrderCreated: MessageTypeDefinition<_events_order_v1_OrderCreated, _events_order_v1_OrderCreated__Output>
        OrderItem: MessageTypeDefinition<_events_order_v1_OrderItem, _events_order_v1_OrderItem__Output>
      }
    }
  }
}

