const Product = require('../models/Product');

const getAllProducts = async (req, res) => {
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
    
    const products = await Product.find(query)
      .populate('farmer', 'name email phone address')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));
    
    res.json({
      success: true,
      data: products
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Server error'
    });
  }
};

const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('farmer', 'name email phone address');
    
    if (!product) {
      return res.status(404).json({ 
        success: false,
        message: 'Product not found' 
      });
    }
    
    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Server error'
    });
  }
};

const createProduct = async (req, res) => {
  try {
    if (req.user.role !== 'farmer') {
      return res.status(403).json({ 
        success: false,
        message: 'Only farmers can add products' 
      });
    }
    
    const { name, description, price, quantity, category, unit, isOrganic } = req.body;
    
    if (!name || !description || !price || !quantity) {
      return res.status(400).json({
        success: false,
        message: 'Name, description, price, and quantity are required'
      });
    }

    const productData = {
      name: name.trim(),
      description: description.trim(),
      price: parseFloat(price),
      quantity: parseInt(quantity),
      category: category || 'vegetables',
      unit: unit || 'kg',
      isOrganic: isOrganic !== false,
      farmer: req.user.userId
    };
    
    const product = new Product(productData);
    await product.save();
    
    await product.populate('farmer', 'name email phone address');
    
    res.status(201).json({
      success: true,
      message: 'Product added successfully',
      data: product
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = { getAllProducts, getProductById, createProduct };
