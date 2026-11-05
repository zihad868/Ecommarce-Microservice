export const TOPICS = {
  orderCreated: 'order.created.v1',
  stockReleaseRequested: 'order.stock-release-requested.v1',
  stockReservationFailed: 'inventory.stock-reservation-failed.v1',
  stockReleased: 'inventory.stock-released.v1',
} as const;

export type TopicName = (typeof TOPICS)[keyof typeof TOPICS];

export const EVENT_TOPIC_MAP: Record<string, string> = {
  OrderCreated: TOPICS.orderCreated,
  StockReleaseRequested: TOPICS.stockReleaseRequested,
  StockReservationFailed: TOPICS.stockReservationFailed,
  StockReleased: TOPICS.stockReleased,
};
