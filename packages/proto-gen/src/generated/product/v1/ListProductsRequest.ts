// Original file: contracts/proto/product/v1/product.proto


export interface ListProductsRequest {
  'category'?: (string);
  'search'?: (string);
  'limit'?: (number);
  'cursor'?: (string);
}

export interface ListProductsRequest__Output {
  'category': (string);
  'search': (string);
  'limit': (number);
  'cursor': (string);
}
