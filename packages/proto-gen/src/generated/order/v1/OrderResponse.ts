// Original file: contracts/proto/order/v1/order.proto


export interface OrderResponse {
  'success'?: (boolean);
  'id'?: (string);
  'userId'?: (string);
  'totalAmount'?: (number | string);
  'status'?: (string);
  'error'?: (string);
}

export interface OrderResponse__Output {
  'success': (boolean);
  'id': (string);
  'userId': (string);
  'totalAmount': (number);
  'status': (string);
  'error': (string);
}
