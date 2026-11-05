// Original file: contracts/proto/payment/v1/payment.proto

import type { Money as _common_v1_Money, Money__Output as _common_v1_Money__Output } from '../../common/v1/Money';

export interface CreatePaymentRequest {
  'order_id'?: (string);
  'user_id'?: (string);
  'idempotency_key'?: (string);
  'amount'?: (_common_v1_Money | null);
}

export interface CreatePaymentRequest__Output {
  'order_id': (string);
  'user_id': (string);
  'idempotency_key': (string);
  'amount': (_common_v1_Money__Output | null);
}
