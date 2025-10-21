const express = require('express');
const Order = require('../models/Order');
const Product = require('../models/Product');
const auth = require('../middleware/auth');
const router = express.Router();

// Create new order
router.post('/', auth, async (req, res) => {
  try {
    console.log('=== ORDER CREATION START ===');
    console.log('User:', req.user.email, 'Role:', req.user.role);
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    const { items, deliveryAddress, notes, paymentMethod } = req.body;
    
    // 1. Role validation
    if (req.user.role !== 'customer') {
      return res.status(403).json({ 
        success: false,
        message: 'Only customers can place orders' 
      });
    }

    // 2. Items validation
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Order must contain at least one item',
        errors: ['No items provided in order']
      });
    }

    // 3. Delivery address validation
    if (!deliveryAddress || !deliveryAddress.street || !deliveryAddress.city || 
        !deliveryAddress.pincode || !deliveryAddress.phone) {
      return res.status(400).json({
        success: false,
        message: 'Complete delivery address is required',
        errors: ['Missing required address fields']
      });
    }

    console.log(`\nValidating ${items.length} items...`);

    // 4. Product validation and order preparation
    let totalAmount = 0;
    const orderItems = [];
    const validationErrors = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      console.log(`\nItem ${i + 1}: ${item.productName} (ID: ${item.productId})`);
      
      // Validate item structure
      if (!item.productId || !item.quantity || item.price === undefined) {
        validationErrors.push(`Item ${i + 1}: Missing required fields`);
        continue;
      }

      // Validate quantity
      const quantity = parseInt(item.quantity);
      if (isNaN(quantity) || quantity <= 0) {
        validationErrors.push(`Item ${i + 1} "${item.productName}": Invalid quantity`);
        continue;
      }

      try {
        // Find product by ID
        const product = await Product.findById(item.productId);
        
        if (!product) {
          validationErrors.push(`Item ${i + 1}: Product not found`);
          console.log('Product not found');
          continue;
        }

        console.log(`Found: ${product.name} (Stock: ${product.quantity})`);

        // Check stock availability
        if (product.quantity < quantity) {
          validationErrors.push(
            `"${product.name}": Insufficient stock (Available: ${product.quantity})`
          );
          console.log('Insufficient stock');
          continue;
        }

        // CRITICAL: Ensure farmer field exists
        if (!product.farmer) {
          validationErrors.push(`"${product.name}": No farmer associated`);
          console.log('No farmer associated');
          continue;
        }

        // Calculate item total
        const itemTotal = parseFloat(product.price) * quantity;
        totalAmount += itemTotal;

        // Add validated item to order
        orderItems.push({
          product: product._id,
          productName: product.name,
          quantity: quantity,
          price: parseFloat(product.price),
          unit: product.unit,
          farmer: product.farmer
        });

        console.log(`Validated: ${product.name} x${quantity} = Rs.${itemTotal}`);

      } catch (error) {
        console.error(`Database error for item ${i + 1}:`, error.message);
        validationErrors.push(`Item ${i + 1}: Database error`);
      }
    }

    // 5. Check validation results
    if (validationErrors.length > 0) {
      console.log('\nVALIDATION FAILED:');
      validationErrors.forEach((err, idx) => console.log(`  ${idx + 1}. ${err}`));
      
      return res.status(400).json({
        success: false,
        message: 'Order validation failed',
        errors: validationErrors
      });
    }

    if (orderItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid items in order',
        errors: ['All items failed validation']
      });
    }

    console.log(`\nAll items validated. Creating order...`);
    console.log(`Total amount: Rs.${totalAmount}`);

    // 6. Create order
    const order = new Order({
      customer: req.user.userId,
      items: orderItems,
      totalAmount: totalAmount,
      deliveryAddress: {
        street: deliveryAddress.street.trim(),
        city: deliveryAddress.city.trim(),
        state: deliveryAddress.state.trim(),
        pincode: deliveryAddress.pincode.trim(),
        phone: deliveryAddress.phone.trim()
      },
      paymentMethod: paymentMethod || 'cod',
      paymentStatus: 'pending',
      notes: notes?.trim() || ''
    });

    // 7. Save order (orderNumber will be auto-generated)
    await order.save();
    console.log(`Order saved: ${order.orderNumber}`);

    // 8. Update product stock
    for (const orderItem of orderItems) {
      const updatedProduct = await Product.findByIdAndUpdate(
        orderItem.product,
        { $inc: { quantity: -orderItem.quantity } },
        { new: true }
      );
      console.log(`Updated stock for ${orderItem.productName}: ${updatedProduct.quantity} remaining`);
    }
    
    // 9. Populate order data for response
    await order.populate([
      { path: 'customer', select: 'name email phone' },
      { path: 'items.farmer', select: 'name email phone' }
    ]);

    console.log('ORDER CREATION COMPLETE\n');

    // 10. Send success response
    res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      order: {
        orderNumber: order.orderNumber,
        _id: order._id,
        totalAmount: order.totalAmount,
        deliveryFee: order.deliveryFee,
        status: order.status,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        items: order.items,
        deliveryAddress: order.deliveryAddress,
        createdAt: order.createdAt,
        customer: order.customer
      }
    });

  } catch (error) {
    console.error('CRITICAL ORDER ERROR:', error);
    console.error('Stack trace:', error.stack);
    
    res.status(500).json({
      success: false,
      message: 'Internal server error during order creation',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server error',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Get customer orders
router.get('/my-orders', auth, async (req, res) => {
  try {
    if (req.user.role !== 'customer') {
      return res.status(403).json({ 
        success: false,
        message: 'Access denied' 
      });
    }

    const orders = await Order.find({ customer: req.user.userId })
      .populate('items.farmer', 'name')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      orders
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
});

// Get farmer orders
router.get('/farmer-orders', auth, async (req, res) => {
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
    .sort({ createdAt: -1 });

    const filteredOrders = orders.map(order => ({
      ...order.toObject(),
      items: order.items.filter(item => 
        item.farmer.toString() === req.user.userId
      )
    }));

    res.json({
      success: true,
      orders: filteredOrders
    });
  } catch (error) {
    console.error('Error fetching farmer orders:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
});

// Update order status
router.patch('/:orderId/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const { orderId } = req.params;

    if (req.user.role !== 'farmer') {
      return res.status(403).json({ 
        success: false,
        message: 'Only farmers can update order status' 
      });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ 
        success: false,
        message: 'Order not found' 
      });
    }

    const hasItems = order.items.some(item => 
      item.farmer.toString() === req.user.userId
    );

    if (!hasItems) {
      return res.status(403).json({ 
        success: false,
        message: 'You can only update orders containing your products' 
      });
    }

    order.status = status;
    await order.save();

    res.json({
      success: true,
      message: 'Order status updated successfully',
      order
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
});

module.exports = router;