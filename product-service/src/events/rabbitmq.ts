import amqp from 'amqplib';
import * as productService from '../services/productService';
import { getRedisClient } from '../utils/redisClient';

let channel: amqp.Channel | null = null;

interface OrderItem {
  productId: string;
  quantity: number;
}

interface OrderCreatedEvent {
  orderId: string;
  items: OrderItem[];
}

export const connectRabbitMQ = async (): Promise<void> => {
  try {
    const amqpUrl = process.env.RABBITMQ_URL || 'amqp://localhost';
    const connection = await amqp.connect(amqpUrl);
    channel = await connection.createChannel();
    const queue = 'order.created';

    await channel.assertQueue(queue, { durable: true });
    console.log(`Product Service waiting for messages in ${queue}`);

    await channel.consume(queue, async (msg) => {
      if (msg !== null && channel) {
        try {
          const event: OrderCreatedEvent = JSON.parse(msg.content.toString());
          console.log('Received Event:', event);

          // Update DB
          for (const item of event.items) {
            try {
              await productService.decrementProductStock(item.productId, item.quantity);
            } catch (err) {
               console.error(`Could not update stock for product ${item.productId}`, err);
            }
          }

          // Invalidate list caches as well
          const redis = getRedisClient();
          const listKeys = await redis.keys('products:list:*');
          if (listKeys.length > 0) await redis.del(...listKeys);

          channel.ack(msg);
        } catch (err) {
          console.error('Error processing event', err);
          // Ack to avoid blocking queue
          channel.ack(msg);
        }
      }
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error('RabbitMQ Connection failed, retrying in 5s...', errMsg);
    setTimeout(() => void connectRabbitMQ(), 5000);
  }
};
