const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  productName: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  unit: {
    type: String,
    required: true
  },
  farmer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
});

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    unique: true,
    sparse: true // Allows multiple null values during creation
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: {
    type: [orderItemSchema],
    validate: {
      validator: function(items) {
        return items && items.length > 0;
      },
      message: 'Order must have at least one item'
    }
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  deliveryFee: {
    type: Number,
    default: 50
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'],
    default: 'pending'
  },
  deliveryAddress: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    phone: { type: String, required: true }
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['cod', 'online'],
    default: 'cod'
  },
  notes: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Generate unique order number before saving
orderSchema.pre('save', async function(next) {
  try {
    if (this.isNew && !this.orderNumber) {
      const timestamp = Date.now();
      const randomSuffix = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
      this.orderNumber = `ORD-${timestamp}-${randomSuffix}`;
      
      console.log(`Generated order number: ${this.orderNumber}`);
    }
    next();
  } catch (error) {
    console.error('Error generating order number:', error);
    next(error);
  }
});

// Index for faster queries
orderSchema.index({ customer: 1, createdAt: -1 });
orderSchema.index({ 'items.farmer': 1, createdAt: -1 });
orderSchema.index({ orderNumber: 1 });

module.exports = mongoose.model('Order', orderSchema);