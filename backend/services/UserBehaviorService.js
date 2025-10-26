const User = require('../models/User');
const Product = require('../models/Product');
const { geminiAPI } = require('./GeminiService');

class UserBehaviorService {
  
  static async trackSearch(userId, searchQuery, results = []) {
    try {
      const searchData = {
        query: searchQuery.toLowerCase().trim(),
        resultCount: results.length,
        resultsIds: results.map(p => p._id).slice(0, 5),
        timestamp: new Date()
      };

      await User.findByIdAndUpdate(userId, {
        $push: {
          searchHistory: {
            $each: [searchData],
            $slice: -20
          }
        }
      });

    } catch (error) {
      console.error('Error tracking search:', error);
    }
  }

  static async trackProductView(userId, productId, category) {
    try {
      const viewData = {
        productId,
        category,
        timestamp: new Date()
      };

      await User.findByIdAndUpdate(userId, {
        $push: {
          viewHistory: {
            $each: [viewData],
            $slice: -50
          }
        }
      });

    } catch (error) {
      console.error('Error tracking product view:', error);
    }
  }

  static async getPersonalizedRecommendations(userId, context = 'general') {
    try {
      const user = await User.findById(userId);
      if (!user) return [];

      const availableProducts = await Product.find({ inStock: true })
        .populate('farmer', 'name')
        .limit(50);

      if (availableProducts.length === 0) return [];

      const searchHistory = user.searchHistory?.slice(-5) || [];
      const viewHistory = user.viewHistory?.slice(-5) || [];

      const prompt = `Based on user behavior, recommend 6 products from: ${availableProducts.map(p => p.name).join(', ')}. 
      User searches: ${searchHistory.map(s => s.query).join(', ')}
      Return JSON array: ["Product 1", "Product 2", "Product 3", "Product 4", "Product 5", "Product 6"]`;

      try {
        const response = await geminiAPI.getFarmingAdvice({
          query: prompt,
          type: 'personalized_recommendations'
        });

        if (response.success && response.data?.advice) {
          const recommendedNames = JSON.parse(response.data.advice);
          const recommendations = [];
          
          for (const name of recommendedNames) {
            const product = availableProducts.find(p => 
              p.name.toLowerCase().includes(name.toLowerCase()) ||
              name.toLowerCase().includes(p.name.toLowerCase())
            );
            if (product) recommendations.push(product);
          }
          
          return recommendations.slice(0, 6);
        }
      } catch (parseError) {
        console.error('AI recommendation failed, using fallback');
      }

      return this.getFallbackRecommendations(availableProducts);
    } catch (error) {
      console.error('Error generating recommendations:', error);
      return [];
    }
  }

  static getFallbackRecommendations(availableProducts) {
    return availableProducts
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 6);
  }

  static async getRelatedProducts(productId, limit = 4) {
    try {
      const currentProduct = await Product.findById(productId);
      if (!currentProduct) return [];

      const relatedProducts = await Product.find({
        _id: { $ne: productId },
        category: currentProduct.category,
        inStock: true
      })
      .populate('farmer', 'name')
      .limit(limit);

      return relatedProducts;
    } catch (error) {
      console.error('Error getting related products:', error);
      return [];
    }
  }
}

module.exports = UserBehaviorService;
