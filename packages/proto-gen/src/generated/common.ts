import type * as grpc from '@grpc/grpc-js';
import type { MessageTypeDefinition } from '@grpc/proto-loader';

import type { EventMetadata as _common_v1_EventMetadata, EventMetadata__Output as _common_v1_EventMetadata__Output } from './common/v1/EventMetadata';
import type { Money as _common_v1_Money, Money__Output as _common_v1_Money__Output } from './common/v1/Money';

type SubtypeConstructor<Constructor extends new (...args: any) => any, Subtype> = {
  new(...args: ConstructorParameters<Constructor>): Subtype;
};

export interface ProtoGrpcType {
  common: {
    v1: {
      EventMetadata: MessageTypeDefinition<_common_v1_EventMetadata, _common_v1_EventMetadata__Output>
      Money: MessageTypeDefinition<_common_v1_Money, _common_v1_Money__Output>
    }
  }
}

