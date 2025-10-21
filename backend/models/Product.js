const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Product description is required'],
    trim: true
  },
  price: {
    type: Number,
    required: [true, 'Product price is required'],
    min: [0, 'Price cannot be negative']
  },
  category: {
    type: String,
    required: [true, 'Product category is required'],
    enum: ['vegetables', 'fruits', 'grains', 'dairy', 'herbs', 'spices', 'others'],
    lowercase: true
  },
  farmer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Farmer reference is required']
  },
  inStock: {
    type: Boolean,
    default: true
  },
  quantity: {
    type: Number,
    required: [true, 'Product quantity is required'],
    min: [0, 'Quantity cannot be negative']
  },
  unit: {
    type: String,
    required: [true, 'Product unit is required'],
    enum: ['kg', 'g', 'pieces', 'liters', 'ml', 'dozen'],
    lowercase: true
  },
  isOrganic: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Update inStock based on quantity
productSchema.pre('save', function(next) {
  this.inStock = this.quantity > 0;
  next();
});

module.exports = mongoose.model('Product', productSchema);
