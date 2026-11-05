import type * as grpc from '@grpc/grpc-js';
import type { MessageTypeDefinition } from '@grpc/proto-loader';

import type { StockReservationFailed as _events_inventory_v1_StockReservationFailed, StockReservationFailed__Output as _events_inventory_v1_StockReservationFailed__Output } from './events/inventory/v1/StockReservationFailed';

type SubtypeConstructor<Constructor extends new (...args: any) => any, Subtype> = {
  new(...args: ConstructorParameters<Constructor>): Subtype;
};

export interface ProtoGrpcType {
  events: {
    inventory: {
      v1: {
        StockReservationFailed: MessageTypeDefinition<_events_inventory_v1_StockReservationFailed, _events_inventory_v1_StockReservationFailed__Output>
      }
    }
  }
}

