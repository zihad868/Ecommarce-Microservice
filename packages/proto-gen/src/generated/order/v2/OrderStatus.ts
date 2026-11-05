// Original file: contracts/proto/order/v2/order_v2.proto

export const OrderStatus = {
  ORDER_STATUS_UNSPECIFIED: 'ORDER_STATUS_UNSPECIFIED',
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  PAID: 'PAID',
  SHIPPED: 'SHIPPED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;

export type OrderStatus =
  | 'ORDER_STATUS_UNSPECIFIED'
  | 0
  | 'PENDING'
  | 1
  | 'CONFIRMED'
  | 2
  | 'PAID'
  | 3
  | 'SHIPPED'
  | 4
  | 'COMPLETED'
  | 5
  | 'CANCELLED'
  | 6

export type OrderStatus__Output = typeof OrderStatus[keyof typeof OrderStatus]
