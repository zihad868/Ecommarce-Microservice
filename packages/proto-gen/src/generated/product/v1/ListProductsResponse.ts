// Original file: contracts/proto/product/v1/product.proto

import type { Product as _product_v1_Product, Product__Output as _product_v1_Product__Output } from '../../product/v1/Product';
import type { PageInfo as _product_v1_PageInfo, PageInfo__Output as _product_v1_PageInfo__Output } from '../../product/v1/PageInfo';

export interface ListProductsResponse {
  'products'?: (_product_v1_Product)[];
  'page'?: (_product_v1_PageInfo | null);
}

export interface ListProductsResponse__Output {
  'products': (_product_v1_Product__Output)[];
  'page': (_product_v1_PageInfo__Output | null);
}
