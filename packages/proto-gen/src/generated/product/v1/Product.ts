// Original file: contracts/proto/product/v1/product.proto

import type { Money as _common_v1_Money, Money__Output as _common_v1_Money__Output } from '../../common/v1/Money';

export interface Product {
  'id'?: (string);
  'name'?: (string);
  'price'?: (_common_v1_Money | null);
  'stock'?: (number);
  'category'?: (string);
  'description'?: (string);
}

export interface Product__Output {
  'id': (string);
  'name': (string);
  'price': (_common_v1_Money__Output | null);
  'stock': (number);
  'category': (string);
  'description': (string);
}
