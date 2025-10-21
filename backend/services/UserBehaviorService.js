const User = require('../models/User');
const Product = require('../models/Product');
const { geminiAPI } = require('./GeminiService');

class UserBehaviorService {
  
  // ✅ Track user search behavior
  static async trackSearch(userId, searchQuery, results = []) {
    try {
      const searchData = {
        userId,
        query: searchQuery.toLowerCase().trim(),
        resultCount: results.length,
        timestamp: new Date(),
        resultsIds: results.map(p => p._id).slice(0, 5) // Store top 5 results
      };

      // Store in user's search history
      await User.findByIdAndUpdate(userId, {
        $push: {
          searchHistory: {
            $each: [searchData],
            $slice: -20 // Keep only last 20 searches
          }
        }
      });

      console.log(`📊 Tracked search: "${searchQuery}" for user ${userId}`);
    } catch (error) {
      console.error('Error tracking search:', error);
    }
  }

  // ✅ Track product views
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
            $slice: -50 // Keep last 50 views
          }
        }
      });

      console.log(`👁️ Tracked product view: ${productId} for user ${userId}`);
    } catch (error) {
      console.error('Error tracking product view:', error);
    }
  }

  // ✅ Track purchases
  static async trackPurchase(userId, orderItems) {
    try {
      const purchaseData = orderItems.map(item => ({
        productId: item.product,
        productName: item.productName,
        category: item.category,
        quantity: item.quantity,
        price: item.price,
        timestamp: new Date()
      }));

      await User.findByIdAndUpdate(userId, {
        $push: {
          purchaseHistory: {
            $each: purchaseData,
            $slice: -30 // Keep last 30 purchases
          }
        }
      });

      console.log(`🛒 Tracked purchase for user ${userId}: ${orderItems.length} items`);
    } catch (error) {
      console.error('Error tracking purchase:', error);
    }
  }

  // ✅ Generate AI recommendations
  static async getPersonalizedRecommendations(userId, context = 'general') {
    try {
      const user = await User.findById(userId).populate('viewHistory.productId');
      if (!user) return [];

      const searchHistory = user.searchHistory?.slice(-10) || [];
      const viewHistory = user.viewHistory?.slice(-10) || [];
      const purchaseHistory = user.purchaseHistory?.slice(-10) || [];

      // Get all available products
      const availableProducts = await Product.find({ inStock: true })
        .populate('farmer', 'name')
        .limit(50);

      const prompt = `
        You are an AI assistant for Raj's Organic Farmers Market in India. 
        
        User Context: ${context}
        Recent Searches: ${searchHistory.map(s => s.query).join(', ')}
        Recently Viewed Categories: ${viewHistory.map(v => v.category).join(', ')}
        Purchase History: ${purchaseHistory.map(p => p.productName).join(', ')}
        
        Available Products: ${availableProducts.map(p => `${p.name} (${p.category})`).join(', ')}
        
        Based on this user's behavior, recommend 6 relevant organic products from the available list.
        Consider:
        - Seasonal relevance (current month: ${new Date().toLocaleString('default', { month: 'long' })})
        - Complementary products
        - User preferences from history
        - Nutritional variety
        
        Return ONLY a JSON array of exact product names from the available products list:
        ["Product Name 1", "Product Name 2", "Product Name 3", "Product Name 4", "Product Name 5", "Product Name 6"]
      `;

      const response = await geminiAPI.getFarmingAdvice({
        query: prompt,
        type: 'personalized_recommendations'
      });

      if (response.data?.advice) {
        try {
          const recommendedNames = JSON.parse(response.data.advice);
          
          // Find actual products matching the recommendations
          const recommendations = [];
          for (const name of recommendedNames) {
            const product = availableProducts.find(p => 
              p.name.toLowerCase().includes(name.toLowerCase()) ||
              name.toLowerCase().includes(p.name.toLowerCase())
            );
            if (product) {
              recommendations.push(product);
            }
          }

          console.log(`🤖 Generated ${recommendations.length} AI recommendations for user ${userId}`);
          return recommendations;
        } catch (parseError) {
          console.error('Error parsing AI recommendations:', parseError);
        }
      }

      // Fallback to category-based recommendations
      return this.getFallbackRecommendations(user, availableProducts);
    } catch (error) {
      console.error('Error generating recommendations:', error);
      return [];
    }
  }

  // ✅ Fallback recommendations when AI fails
  static getFallbackRecommendations(user, availableProducts) {
    const userCategories = new Set();
    
    // Extract categories from user history
    user.viewHistory?.forEach(view => {
      if (view.category) userCategories.add(view.category);
    });
    user.purchaseHistory?.forEach(purchase => {
      if (purchase.category) userCategories.add(purchase.category);
    });

    // If no history, use popular categories
    if (userCategories.size === 0) {
      userCategories.add('vegetables');
      userCategories.add('fruits');
    }

    const recommendations = [];
    Array.from(userCategories).forEach(category => {
      const categoryProducts = availableProducts.filter(p => p.category === category);
      recommendations.push(...categoryProducts.slice(0, 2));
    });

    return recommendations.slice(0, 6);
  }

  // ✅ Get related products based on current product
  static async getRelatedProducts(productId, limit = 4) {
    try {
      const currentProduct = await Product.findById(productId);
      if (!currentProduct) return [];

      // Find products in same category or with similar attributes
      const relatedProducts = await Product.find({
        _id: { $ne: productId },
        $or: [
          { category: currentProduct.category },
          { isOrganic: currentProduct.isOrganic },
          { farmer: currentProduct.farmer }
        ],
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
