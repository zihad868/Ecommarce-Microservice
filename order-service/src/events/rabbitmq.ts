import amqp from 'amqplib';

let channel: amqp.Channel | null = null;

export const connectRabbitMQ = async (): Promise<void> => {
  try {
    const amqpUrl = process.env.RABBITMQ_URL || 'amqp://localhost';
    const connection = await amqp.connect(amqpUrl);
    channel = await connection.createChannel();
    console.log('Order Service RabbitMQ Connected');
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error('RabbitMQ Connection failed, retrying in 5s...', errMsg);
    setTimeout(() => void connectRabbitMQ(), 5000);
  }
};

export const publishEvent = async (queue: string, data: unknown): Promise<void> => {
  if (!channel) {
    console.error('RabbitMQ Channel not ready');
    return;
  }
  await channel.assertQueue(queue, { durable: true });
  channel.sendToQueue(queue, Buffer.from(JSON.stringify(data)), {
    persistent: true,
  });
  console.log(`Published event to ${queue}:`, data);
};
