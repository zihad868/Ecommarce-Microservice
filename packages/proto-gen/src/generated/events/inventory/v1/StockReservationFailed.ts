// Original file: contracts/events/inventory/v1/stock_reservation_failed.proto


export interface StockReservationFailed {
  'eventId'?: (string);
  'orderId'?: (string);
  'reason'?: (string);
  'occurredAt'?: (string);
}

export interface StockReservationFailed__Output {
  'eventId': (string);
  'orderId': (string);
  'reason': (string);
  'occurredAt': (string);
}
