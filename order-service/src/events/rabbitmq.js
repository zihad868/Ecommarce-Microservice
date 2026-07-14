const amqp = require('amqplib');

let channel;

const connectRabbitMQ = async () => {
  try {
    const amqpUrl = process.env.RABBITMQ_URL || 'amqp://localhost';
    const connection = await amqp.connect(amqpUrl);
    channel = await connection.createChannel();
    console.log('Order Service RabbitMQ Connected');
  } catch (err) {
    console.error('RabbitMQ Connection failed, retrying in 5s...', err.message);
    setTimeout(connectRabbitMQ, 5000);
  }
};

const publishEvent = async (queue, data) => {
  if (!channel) {
    console.error('RabbitMQ Channel not ready');
    return;
  }
  await channel.assertQueue(queue, { durable: true });
  channel.sendToQueue(queue, Buffer.from(JSON.stringify(data)), { persistent: true });
  console.log(`Published event to ${queue}:`, data);
};

module.exports = { connectRabbitMQ, publishEvent };
