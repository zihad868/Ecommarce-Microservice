// Original file: contracts/events/inventory/v1/stock_reserved.proto

import type { EventMetadata as _common_v1_EventMetadata, EventMetadata__Output as _common_v1_EventMetadata__Output } from '../../../common/v1/EventMetadata';

export interface StockReserved {
  'metadata'?: (_common_v1_EventMetadata | null);
  'order_id'?: (string);
  'reservation_id'?: (string);
  'expires_at'?: (string);
}

export interface StockReserved__Output {
  'metadata': (_common_v1_EventMetadata__Output | null);
  'order_id': (string);
  'reservation_id': (string);
  'expires_at': (string);
}
