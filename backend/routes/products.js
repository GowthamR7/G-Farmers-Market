const express = require('express');
const Product = require('../models/Product');
const auth = require('../middleware/auth');
const router = express.Router();

// Get all products with populated farmer data
router.get('/', async (req, res) => {
  try {
    const { category, search, limit = 50 } = req.query;
    let query = {};
    
    if (category && category !== 'all') {
      query.category = category;
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    console.log('Fetching products with query:', query);
    
    // Populate farmer data with selected fields
    const products = await Product.find(query)
      .populate('farmer', 'name email phone address')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));
    
    console.log(`Found ${products.length} products`);
    
    // Handle products without farmer data
    const sanitizedProducts = products.map(product => {
      const productObj = product.toObject();
      return {
        ...productObj,
        farmer: productObj.farmer || {
          _id: 'unknown',
          name: 'Local Farmer',
          email: 'contact@localfarmer.com'
        }
      };
    });
    
    res.json({
      success: true,
      data: sanitizedProducts
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get single product by ID with farmer data
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('farmer', 'name email phone address');
    
    if (!product) {
      return res.status(404).json({ 
        success: false,
        message: 'Product not found' 
      });
    }
    
    // Handle missing farmer data
    const sanitizedProduct = {
      ...product.toObject(),
      farmer: product.farmer || {
        _id: 'unknown',
        name: 'Local Farmer',
        email: 'contact@localfarmer.com'
      }
    };
    
    res.json({
      success: true,
      data: sanitizedProduct
    });
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ✅ FIXED: Add new product (Farmers only)
router.post('/', auth, async (req, res) => {
  try {
    console.log('🔍 Add product request:', {
      userId: req.user.userId,
      userRole: req.user.role,
      body: req.body
    });

    // Check user role
    if (req.user.role !== 'farmer') {
      console.log('❌ Access denied: User is not a farmer');
      return res.status(403).json({ 
        success: false,
        message: 'Only farmers can add products' 
      });
    }
    
    // ✅ Validate required fields
    const { name, description, price, quantity, category, unit, isOrganic } = req.body;
    
    if (!name || !description || !price || !quantity) {
      return res.status(400).json({
        success: false,
        message: 'Name, description, price, and quantity are required'
      });
    }

    if (price <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Price must be greater than 0'
      });
    }

    if (quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be greater than 0'
      });
    }
    
    // ✅ Create product data with farmer ID
    const productData = {
      name: name.trim(),
      description: description.trim(),
      price: parseFloat(price),
      quantity: parseInt(quantity),
      category: category || 'vegetables',
      unit: unit || 'kg',
      isOrganic: isOrganic !== false, // Default to true
      farmer: req.user.userId // This is the farmer's ID from JWT
    };
    
    console.log('📝 Creating product with data:', productData);
    
    const product = new Product(productData);
    await product.save();
    
    console.log('✅ Product saved successfully:', product._id);
    
    // Populate farmer data before sending response
    await product.populate('farmer', 'name email phone address');
    
    console.log('🎉 Product created and populated:', {
      id: product._id,
      name: product.name,
      farmer: product.farmer?.name
    });
    
    res.status(201).json({
      success: true,
      message: 'Product added successfully',
      data: product
    });
  } catch (error) {
    console.error('❌ Error adding product:', error);
    
    // ✅ FIXED: Handle validation errors (removed TypeScript syntax)
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: messages
      });
    }
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Product with this name already exists'
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Server error while adding product',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
