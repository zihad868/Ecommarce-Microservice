import type * as grpc from '@grpc/grpc-js';
import type { MessageTypeDefinition } from '@grpc/proto-loader';

import type { EventMetadata as _common_v1_EventMetadata, EventMetadata__Output as _common_v1_EventMetadata__Output } from './common/v1/EventMetadata';
import type { Money as _common_v1_Money, Money__Output as _common_v1_Money__Output } from './common/v1/Money';
import type { CreatePaymentRequest as _payment_v1_CreatePaymentRequest, CreatePaymentRequest__Output as _payment_v1_CreatePaymentRequest__Output } from './payment/v1/CreatePaymentRequest';
import type { CreatePaymentResponse as _payment_v1_CreatePaymentResponse, CreatePaymentResponse__Output as _payment_v1_CreatePaymentResponse__Output } from './payment/v1/CreatePaymentResponse';
import type { PaymentServiceClient as _payment_v1_PaymentServiceClient, PaymentServiceDefinition as _payment_v1_PaymentServiceDefinition } from './payment/v1/PaymentService';

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
  payment: {
    v1: {
      CreatePaymentRequest: MessageTypeDefinition<_payment_v1_CreatePaymentRequest, _payment_v1_CreatePaymentRequest__Output>
      CreatePaymentResponse: MessageTypeDefinition<_payment_v1_CreatePaymentResponse, _payment_v1_CreatePaymentResponse__Output>
      PaymentService: SubtypeConstructor<typeof grpc.Client, _payment_v1_PaymentServiceClient> & { service: _payment_v1_PaymentServiceDefinition }
    }
  }
}

