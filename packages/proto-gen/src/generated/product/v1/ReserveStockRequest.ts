// Original file: contracts/proto/product/v1/product.proto

import type { StockItem as _product_v1_StockItem, StockItem__Output as _product_v1_StockItem__Output } from '../../product/v1/StockItem';

export interface ReserveStockRequest {
  'orderId'?: (string);
  'items'?: (_product_v1_StockItem)[];
}

export interface ReserveStockRequest__Output {
  'orderId': (string);
  'items': (_product_v1_StockItem__Output)[];
}
