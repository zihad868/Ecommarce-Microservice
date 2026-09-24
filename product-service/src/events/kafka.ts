import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import * as productService from '../services/productService';
import { getRedisClient } from '../utils/redisClient';

// ── Types ───────────────────────────────────────────────────
interface OrderItem {
  productId: string;
  quantity: number;
}

interface OrderCreatedEvent {
  orderId: string;
  items: OrderItem[];
}

// ── Kafka setup ─────────────────────────────────────────────
const kafka = new Kafka({
  clientId: 'product-service',
  brokers: [(process.env.KAFKA_BROKER ?? 'localhost:9092')],
});

let consumer: Consumer | null = null;

// ── Connect consumer & start listening ──────────────────────
export const connectKafkaConsumer = async (): Promise<void> => {
  try {
    consumer = kafka.consumer({ groupId: 'product-service-group' });
    await consumer.connect();

    // Subscribe to the topic published by order-service
    await consumer.subscribe({ topic: 'order.created', fromBeginning: false });

    console.log('Product Service Kafka Consumer connected — listening on "order.created"');

    await consumer.run({
      eachMessage: async ({ topic, partition, message }: EachMessagePayload) => {
        const raw = message.value?.toString();
        if (!raw) return;

        try {
          const event: OrderCreatedEvent = JSON.parse(raw) as OrderCreatedEvent;
          console.log(`[Kafka] Received from topic "${topic}" partition ${partition}:`, event);

          // ── Decrement stock for every ordered item ──────
          for (const item of event.items) {
            try {
              await productService.decrementProductStock(item.productId, item.quantity);
            } catch (err) {
              console.error(
                `[Kafka] Could not update stock for product ${item.productId}`,
                err,
              );
            }
          }

          // ── Invalidate list caches ──────────────────────
          const redis = getRedisClient();
          const listKeys = await redis.keys('products:list:*');
          if (listKeys.length > 0) await redis.del(...listKeys);

          console.log(`[Kafka] Processed order ${event.orderId} — stock updated`);
        } catch (err) {
          console.error('[Kafka] Error processing message:', err);
          // No nack in Kafka — message offset will advance automatically
        }
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Kafka Consumer connection failed, retrying in 5s...', msg);
    setTimeout(() => void connectKafkaConsumer(), 5000);
  }
};

// ── Graceful shutdown ───────────────────────────────────────
export const disconnectKafkaConsumer = async (): Promise<void> => {
  if (consumer) {
    await consumer.disconnect();
    console.log('Product Service Kafka Consumer disconnected');
  }
};
