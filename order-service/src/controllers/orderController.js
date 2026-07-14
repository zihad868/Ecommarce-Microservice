const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
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
        productId: String(item.productId),
        quantity: Number(item.quantity),
        price: productResponse.price
      });
    }

    const order = await prisma.order.create({
      data: {
        userId: req.user.id,
        totalAmount,
        status: 'COMPLETED',
        items: {
          create: validatedItems
        }
      },
      include: {
        items: true
      }
    });

    // Publish Event to RabbitMQ
    await publishEvent('order.created', { orderId: order.id.toString(), items: validatedItems });

    res.status(201).json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
};

exports.getOrders = async (req, res, next) => {
  try {
    const orders = await prisma.order.findMany({ 
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      include: { items: true }
    });
    res.status(200).json({ success: true, count: orders.length, data: orders });
  } catch (err) {
    next(err);
  }
};

exports.getOrderById = async (req, res, next) => {
  try {
    const order = await prisma.order.findFirst({ 
      where: { 
        id: Number(req.params.id),
        userId: req.user.id 
      },
      include: { items: true }
    });
    
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });
    res.status(200).json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
};
