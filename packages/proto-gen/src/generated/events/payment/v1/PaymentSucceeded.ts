// Original file: contracts/events/payment/v1/payment_succeeded.proto

import type { EventMetadata as _common_v1_EventMetadata, EventMetadata__Output as _common_v1_EventMetadata__Output } from '../../../common/v1/EventMetadata';
import type { Money as _common_v1_Money, Money__Output as _common_v1_Money__Output } from '../../../common/v1/Money';

export interface PaymentSucceeded {
  'metadata'?: (_common_v1_EventMetadata | null);
  'payment_id'?: (string);
  'order_id'?: (string);
  'amount'?: (_common_v1_Money | null);
}

export interface PaymentSucceeded__Output {
  'metadata': (_common_v1_EventMetadata__Output | null);
  'payment_id': (string);
  'order_id': (string);
  'amount': (_common_v1_Money__Output | null);
}
