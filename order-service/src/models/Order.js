const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  items: [{
    productId: { type: String, required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true }
  }],
  totalAmount: { type: Number, required: true },
  status: { type: String, enum: ['PENDING', 'COMPLETED', 'CANCELLED'], default: 'PENDING' }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
