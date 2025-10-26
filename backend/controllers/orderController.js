const Order = require('../models/Order');
const Product = require('../models/Product');

const createOrder = async (req, res) => {
  try {
    const { items, deliveryAddress, notes, paymentMethod } = req.body;
    
    if (req.user.role !== 'customer') {
      return res.status(403).json({ 
        success: false,
        message: 'Only customers can place orders' 
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Order must contain at least one item'
      });
    }

    if (!deliveryAddress || !deliveryAddress.street || !deliveryAddress.city || 
        !deliveryAddress.state || !deliveryAddress.pincode || !deliveryAddress.phone) {
      return res.status(400).json({
        success: false,
        message: 'Complete delivery address is required'
      });
    }

    let totalAmount = 0;
    const orderItems = [];

    for (const item of items) {
      if (!item.productId || !item.quantity || item.quantity <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid item data'
        });
      }

      const product = await Product.findById(item.productId)
        .populate('farmer', 'name email phone');
      
      if (!product) {
        return res.status(400).json({
          success: false,
          message: `Product not found: ${item.productId}`
        });
      }

      if (product.quantity < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name}. Available: ${product.quantity}, Requested: ${item.quantity}`
        });
      }

      const subtotal = product.price * item.quantity;
      totalAmount += subtotal;

      orderItems.push({
        product: product._id,
        productName: product.name,
        quantity: item.quantity,
        price: product.price,
        unit: product.unit,
        farmer: product.farmer._id,
        subtotal: subtotal
      });
    }

    const order = new Order({
      customer: req.user.userId,
      items: orderItems,
      totalAmount,
      deliveryAddress,
      paymentMethod: paymentMethod || 'cod',
      paymentStatus: 'pending',
      notes: notes || '',
      status: 'pending'
    });

    await order.save();

    for (const orderItem of orderItems) {
      await Product.findByIdAndUpdate(
        orderItem.product,
        { $inc: { quantity: -orderItem.quantity } }
      );
    }
    
    await order.populate([
      { path: 'customer', select: 'name email phone' },
      { path: 'items.farmer', select: 'name email phone' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        totalAmount: order.totalAmount,
        status: order.status
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create order. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const getCustomerOrders = async (req, res) => {
  try {
    if (req.user.role !== 'customer') {
      return res.status(403).json({ 
        success: false,
        message: 'Access denied' 
      });
    }

    const orders = await Order.find({ customer: req.user.userId })
      .populate('items.farmer', 'name email phone')
      .populate('items.product', 'name category')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: orders
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch orders' 
    });
  }
};

const getFarmerOrders = async (req, res) => {
  try {
    if (req.user.role !== 'farmer') {
      return res.status(403).json({ 
        success: false,
        message: 'Access denied' 
      });
    }

    const orders = await Order.find({
      'items.farmer': req.user.userId
    })
    .populate('customer', 'name email phone')
    .populate('items.product', 'name category')
    .sort({ createdAt: -1 });

    const filteredOrders = orders.map(order => ({
      ...order.toObject(),
      items: order.items.filter(item => 
        item.farmer.toString() === req.user.userId
      )
    }));

    res.json({
      success: true,
      data: filteredOrders
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch orders' 
    });
  }
};

module.exports = { createOrder, getCustomerOrders, getFarmerOrders };
