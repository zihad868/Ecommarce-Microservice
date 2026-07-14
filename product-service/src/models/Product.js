const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      index: true, // index for fast name searches
    },
    description: {
      type: String,
      trim: true,
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price must be a positive number'],
      index: true, // index for price-range queries
    },
    stock: {
      type: Number,
      default: 0,
      min: [0, 'Stock cannot be negative'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      index: true, // index for category filtering
    },
    // Flexible attributes field — the key MongoDB advantage over SQL
    // Allows different product types to have different fields without schema changes
    attributes: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true, // adds createdAt, updatedAt automatically
  }
);

// Compound text index for full-text search across name and description
ProductSchema.index({ name: 'text', description: 'text' });

// Compound index for common query pattern: category + price range
ProductSchema.index({ category: 1, price: 1 });

const Product = mongoose.model('Product', ProductSchema);

module.exports = Product;
