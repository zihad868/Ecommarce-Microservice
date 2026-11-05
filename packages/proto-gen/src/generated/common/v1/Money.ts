// Original file: contracts/proto/common/v1/common.proto

import type { Long } from '@grpc/proto-loader';

export interface Money {
  'amount_minor'?: (number | string | Long);
  'currency'?: (string);
  'amount'?: (string);
}

export interface Money__Output {
  'amount_minor': (string);
  'currency': (string);
  'amount': (string);
}
