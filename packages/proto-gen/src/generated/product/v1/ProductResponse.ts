// Original file: contracts/proto/product/v1/product.proto


export interface ProductResponse {
  'success'?: (boolean);
  'id'?: (string);
  'name'?: (string);
  'price'?: (number | string);
  'stock'?: (number);
  'error'?: (string);
}

export interface ProductResponse__Output {
  'success': (boolean);
  'id': (string);
  'name': (string);
  'price': (number);
  'stock': (number);
  'error': (string);
}
