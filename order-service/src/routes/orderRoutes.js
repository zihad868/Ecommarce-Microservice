const express = require('express');
const { createOrder, getOrders, getOrderById } = require('../controllers/orderController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

router.route('/')
  .get(protect, getOrders)
  .post(protect, createOrder);

router.route('/:id')
  .get(protect, getOrderById);

module.exports = router;
