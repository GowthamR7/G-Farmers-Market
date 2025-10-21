const express = require('express');
const UserBehaviorService = require('../services/UserBehaviorService');
const Product = require('../models/Product');
const auth = require('../middleware/auth');
const router = express.Router();

// ✅ Get personalized recommendations for logged-in user
router.get('/personalized', auth, async (req, res) => {
  try {
    const { context = 'general', limit = 6 } = req.query;
    
    console.log(`🎯 Getting personalized recommendations for user ${req.user.userId}`);
    
    const recommendations = await UserBehaviorService.getPersonalizedRecommendations(
      req.user.userId, 
      context
    );

    res.json({
      success: true,
      recommendations: recommendations.slice(0, parseInt(limit)),
      context,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting personalized recommendations:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating recommendations',
      error: error.message
    });
  }
});

// ✅ Get related products for a specific product
router.get('/related/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const { limit = 4 } = req.query;

    console.log(`🔗 Getting related products for product ${productId}`);

    const relatedProducts = await UserBehaviorService.getRelatedProducts(
      productId, 
      parseInt(limit)
    );

    res.json({
      success: true,
      relatedProducts,
      productId,
      count: relatedProducts.length
    });
  } catch (error) {
    console.error('Error getting related products:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting related products',
      error: error.message
    });
  }
});

// ✅ Track user search behavior
router.post('/track-search', auth, async (req, res) => {
  try {
    const { query, results = [] } = req.body;

    await UserBehaviorService.trackSearch(req.user.userId, query, results);

    res.json({
      success: true,
      message: 'Search tracked successfully'
    });
  } catch (error) {
    console.error('Error tracking search:', error);
    res.status(500).json({
      success: false,
      message: 'Error tracking search'
    });
  }
});

// ✅ Track product view
router.post('/track-view', auth, async (req, res) => {
  try {
    const { productId, category } = req.body;

    await UserBehaviorService.trackProductView(req.user.userId, productId, category);

    res.json({
      success: true,
      message: 'Product view tracked successfully'
    });
  } catch (error) {
    console.error('Error tracking product view:', error);
    res.status(500).json({
      success: false,
      message: 'Error tracking product view'
    });
  }
});

// ✅ Get trending/popular products for anonymous users
router.get('/trending', async (req, res) => {
  try {
    const { limit = 6 } = req.query;

    const trendingProducts = await Product.find({ 
      inStock: true,
      quantity: { $gt: 0 }
    })
    .populate('farmer', 'name')
    .sort({ createdAt: -1 }) // Recently added
    .limit(parseInt(limit));

    res.json({
      success: true,
      trendingProducts,
      count: trendingProducts.length
    });
  } catch (error) {
    console.error('Error getting trending products:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting trending products'
    });
  }
});

module.exports = router;
