// Original file: contracts/proto/inventory/v1/inventory.proto

import type { StockItem as _inventory_v1_StockItem, StockItem__Output as _inventory_v1_StockItem__Output } from '../../inventory/v1/StockItem';

export interface ReserveStockRequest {
  'order_id'?: (string);
  'idempotency_key'?: (string);
  'items'?: (_inventory_v1_StockItem)[];
}

export interface ReserveStockRequest__Output {
  'order_id': (string);
  'idempotency_key': (string);
  'items': (_inventory_v1_StockItem__Output)[];
}
