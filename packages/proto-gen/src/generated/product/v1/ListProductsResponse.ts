// Original file: contracts/proto/product/v1/product.proto

import type { ProductResponse as _product_v1_ProductResponse, ProductResponse__Output as _product_v1_ProductResponse__Output } from '../../product/v1/ProductResponse';

export interface ListProductsResponse {
  'products'?: (_product_v1_ProductResponse)[];
  'metaJson'?: (string);
}

export interface ListProductsResponse__Output {
  'products': (_product_v1_ProductResponse__Output)[];
  'metaJson': (string);
}
