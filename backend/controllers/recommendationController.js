const UserBehaviorService = require('../services/UserBehaviorService');

const getPersonalizedRecommendations = async (req, res) => {
  try {
    const { context = 'general', limit = 6 } = req.query;
    
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
    res.status(500).json({
      success: false,
      message: 'Error generating recommendations',
      error: error.message
    });
  }
};

const getRelatedProducts = async (req, res) => {
  try {
    const { productId } = req.params;
    const { limit = 4 } = req.query;

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
    res.status(500).json({
      success: false,
      message: 'Error getting related products',
      error: error.message
    });
  }
};

const trackSearch = async (req, res) => {
  try {
    const { query, results = [] } = req.body;

    await UserBehaviorService.trackSearch(req.user.userId, query, results);

    res.json({
      success: true,
      message: 'Search tracked successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error tracking search'
    });
  }
};

const trackProductView = async (req, res) => {
  try {
    const { productId, category } = req.body;

    await UserBehaviorService.trackProductView(req.user.userId, productId, category);

    res.json({
      success: true,
      message: 'Product view tracked successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error tracking product view'
    });
  }
};

const getTrendingProducts = async (req, res) => {
  try {
    const { limit = 6 } = req.query;

    const trendingProducts = await UserBehaviorService.getTrendingProducts(parseInt(limit));

    res.json({
      success: true,
      trendingProducts,
      count: trendingProducts.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error getting trending products'
    });
  }
};

module.exports = { 
  getPersonalizedRecommendations, 
  getRelatedProducts, 
  trackSearch, 
  trackProductView, 
  getTrendingProducts 
};
