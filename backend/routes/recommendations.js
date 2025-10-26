const express = require('express');
const { 
  getPersonalizedRecommendations, 
  getRelatedProducts, 
  trackSearch, 
  trackProductView, 
  getTrendingProducts 
} = require('../controllers/recommendationController');
const auth = require('../middleware/auth');
const router = express.Router();

router.get('/personalized', auth, getPersonalizedRecommendations);
router.get('/related/:productId', getRelatedProducts);
router.post('/track-search', auth, trackSearch);
router.post('/track-view', auth, trackProductView);
router.get('/trending', getTrendingProducts);

module.exports = router;
