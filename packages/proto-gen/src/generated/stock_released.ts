import type * as grpc from '@grpc/grpc-js';
import type { MessageTypeDefinition } from '@grpc/proto-loader';

import type { StockReleased as _events_inventory_v1_StockReleased, StockReleased__Output as _events_inventory_v1_StockReleased__Output } from './events/inventory/v1/StockReleased';

type SubtypeConstructor<Constructor extends new (...args: any) => any, Subtype> = {
  new(...args: ConstructorParameters<Constructor>): Subtype;
};

export interface ProtoGrpcType {
  events: {
    inventory: {
      v1: {
        StockReleased: MessageTypeDefinition<_events_inventory_v1_StockReleased, _events_inventory_v1_StockReleased__Output>
      }
    }
  }
}

