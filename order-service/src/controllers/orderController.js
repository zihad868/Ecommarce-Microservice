const Order = require('../models/Order');
const { getProductDetails } = require('../grpc/grpcClients');
const { publishEvent } = require('../events/rabbitmq');

exports.createOrder = async (req, res, next) => {
  try {
    const { items } = req.body; // [{ productId, quantity }]
    let totalAmount = 0;
    const validatedItems = [];

    // Check each product via gRPC
    for (let item of items) {
      const productResponse = await getProductDetails(item.productId);
      
      if (!productResponse.success) {
        return res.status(404).json({ success: false, error: `Product ${item.productId} not found` });
      }

      if (productResponse.stock < item.quantity) {
        return res.status(400).json({ success: false, error: `Insufficient stock for product ${productResponse.name}` });
      }

      totalAmount += productResponse.price * item.quantity;
      validatedItems.push({
        productId: item.productId,
        quantity: item.quantity,
        price: productResponse.price
      });
    }

    const order = await Order.create({
      userId: req.user.id,
      items: validatedItems,
      totalAmount,
      status: 'COMPLETED'
    });

    // Publish Event to RabbitMQ
    await publishEvent('order.created', { orderId: order._id, items: validatedItems });

    res.status(201).json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
};

exports.getOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ userId: req.user.id }).sort('-createdAt');
    res.status(200).json({ success: true, count: orders.length, data: orders });
  } catch (err) {
    next(err);
  }
};

exports.getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, userId: req.user.id });
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });
    res.status(200).json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
};
