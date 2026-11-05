// Original file: contracts/proto/order/v2/order_v2.proto


export interface UserOrdersRequest {
  'userId'?: (string);
  'limit'?: (number);
  'cursor'?: (string);
}

export interface UserOrdersRequest__Output {
  'userId': (string);
  'limit': (number);
  'cursor': (string);
}
