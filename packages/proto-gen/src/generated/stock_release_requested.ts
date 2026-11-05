import type * as grpc from '@grpc/grpc-js';
import type { MessageTypeDefinition } from '@grpc/proto-loader';

import type { StockReleaseRequested as _events_order_v1_StockReleaseRequested, StockReleaseRequested__Output as _events_order_v1_StockReleaseRequested__Output } from './events/order/v1/StockReleaseRequested';

type SubtypeConstructor<Constructor extends new (...args: any) => any, Subtype> = {
  new(...args: ConstructorParameters<Constructor>): Subtype;
};

export interface ProtoGrpcType {
  events: {
    order: {
      v1: {
        StockReleaseRequested: MessageTypeDefinition<_events_order_v1_StockReleaseRequested, _events_order_v1_StockReleaseRequested__Output>
      }
    }
  }
}

