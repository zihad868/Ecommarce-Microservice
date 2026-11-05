// Original file: contracts/proto/order/v1/order.proto


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
