const amqp = require('amqplib');
const Product = require('../models/Product');

let channel;

const connectRabbitMQ = async () => {
  try {
    const amqpUrl = process.env.RABBITMQ_URL || 'amqp://localhost';
    const connection = await amqp.connect(amqpUrl);
    channel = await connection.createChannel();
    const queue = 'order.created';

    await channel.assertQueue(queue, { durable: true });
    console.log(`Product Service waiting for messages in ${queue}`);

    channel.consume(queue, async (msg) => {
      if (msg !== null) {
        const event = JSON.parse(msg.content.toString());
        console.log("Received Event:", event);
        
        try {
          // Event: { items: [{ productId: '...', quantity: 2 }] }
          for (let item of event.items) {
            await Product.findByIdAndUpdate(item.productId, { $inc: { stock: -item.quantity } });
          }
          channel.ack(msg);
        } catch (err) {
          console.error("Error processing event", err);
          // Nack if needed, but for simplicity we ack to not block
          channel.ack(msg);
        }
      }
    });
  } catch (err) {
    console.error('RabbitMQ Connection failed, retrying in 5s...', err.message);
    setTimeout(connectRabbitMQ, 5000);
  }
};

module.exports = { connectRabbitMQ };
