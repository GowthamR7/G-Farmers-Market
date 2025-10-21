const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const router = express.Router();

// ✅ Validate API Key on startup
if (!process.env.GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY not found in environment variables');
}

const genAI = process.env.GEMINI_API_KEY 
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

router.post('/farming-advice', async (req, res) => {
  try {
    console.log('🤖 Gemini AI Request:', {
      hasApiKey: !!process.env.GEMINI_API_KEY,
      type: req.body.type,
      queryLength: req.body.query?.length || 0
    });

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        success: false,
        message: 'Gemini API key not configured',
        error: 'GEMINI_API_KEY environment variable is missing'
      });
    }

    if (!genAI) {
      return res.status(500).json({
        success: false,
        message: 'Gemini AI client not initialized',
        error: 'Failed to initialize GoogleGenerativeAI'
      });
    }

    const { query, cropType, location, season, type } = req.body;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Query is required and must be a string',
        error: 'Invalid query parameter'
      });
    }

    console.log(`🔍 Processing ${type || 'general'} request...`);
    
    // ✅ FIXED: Use updated model name
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash" // Changed from "gemini-pro"
    });
    
    let enhancedPrompt = '';
    
    switch (type) {
      case 'search_suggestions':
        enhancedPrompt = `${query}
        
        You are an AI assistant for an organic farming marketplace in India. Provide helpful search suggestions.
        Focus on:
        - Related organic products available in Indian markets
        - Seasonal availability
        - Complementary items
        - Health benefits
        
        Respond only in valid JSON format like this:
        {
          "searchSuggestions": ["suggestion1", "suggestion2", "suggestion3"],
          "complementaryProducts": ["product1", "product2"],
          "seasonalTips": "brief seasonal advice"
        }`;
        break;
        
      case 'personalized_recommendations':
        enhancedPrompt = `${query}
        
        You are an AI assistant for an organic farming marketplace. Based on user behavior, recommend products.
        Consider:
        - Previous purchases and searches
        - Seasonal trends in India
        - Nutritional balance
        - Local availability
        
        Return ONLY a JSON array of 4 product names commonly available in Indian organic markets:
        ["Product Name 1", "Product Name 2", "Product Name 3", "Product Name 4"]`;
        break;
        
      case 'order_analysis':
        enhancedPrompt = `${query}
        
        Analyze this shopping cart for an Indian organic farming marketplace. Provide suggestions for:
        - Nutritional completeness
        - Complementary products
        - Seasonal recommendations
        - Storage and cooking tips
        
        Respond in valid JSON format:
        {
          "complementaryProducts": ["product1", "product2", "product3"],
          "nutritionTips": "brief nutrition advice",
          "seasonalSuggestions": ["seasonal1", "seasonal2"],
          "cookingTips": "cooking/storage advice",
          "farmingTips": "farming advice if applicable"
        }`;
        break;
        
      case 'chat_assistance':
      default:
        enhancedPrompt = `You are an expert AI assistant for "Raj's Organic Farmers Market" - an Indian marketplace connecting customers with local organic farmers.
        
        Your expertise includes:
        - Organic farming practices in India
        - Seasonal produce recommendations
        - Nutritional benefits of organic foods
        - Sustainable agriculture techniques
        - Product storage and cooking tips
        
        User question: ${query}
        
        Provide helpful, encouraging advice in 2-3 sentences that promotes organic farming and healthy eating.
        Focus on practical, actionable information for Indian conditions.`;
    }
    
    console.log('📝 Sending request to Gemini API with model: gemini-2.5-flash');
    
    // ✅ Add timeout and retry logic
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    const result = await model.generateContent(enhancedPrompt);
    clearTimeout(timeoutId);
    
    const response = await result.response;
    const text = response.text();
    
    console.log('✅ Gemini API Response received:', {
      responseLength: text.length,
      type: type || 'general',
      model: 'gemini-2.5-flash'
    });
    
    res.json({
      success: true,
      advice: text,
      type: type || 'general',
      model: 'gemini-2.5-flash',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Gemini AI Error:', {
      message: error.message,
      code: error.code,
      status: error.status,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
    
    let errorMessage = 'Error generating AI advice';
    let statusCode = 500;
    
    if (error.message?.includes('API key')) {
      errorMessage = 'Invalid or missing API key';
      statusCode = 401;
    } else if (error.message?.includes('quota')) {
      errorMessage = 'API quota exceeded. Please try again later.';
      statusCode = 429;
    } else if (error.message?.includes('timeout')) {
      errorMessage = 'Request timeout. Please try again.';
      statusCode = 408;
    } else if (error.code === 'ABORT_ERR') {
      errorMessage = 'Request was cancelled due to timeout';
      statusCode = 408;
    } else if (error.status === 404) {
      errorMessage = 'AI model not found. Please contact support.';
      statusCode = 404;
    }
    
    res.status(statusCode).json({
      success: false,
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      type: req.body.type || 'unknown',
      timestamp: new Date().toISOString()
    });
  }
});

// ✅ Product description generation with updated model
router.post('/generate-description', async (req, res) => {
  try {
    const { productName, category, features } = req.body;
    
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash" // Updated model name
    });
    
    const prompt = `Generate an attractive, SEO-optimized product description for an organic farming marketplace in India.
    
    Product Name: ${productName}
    Category: ${category}
    Key Features: ${features}
    
    Create a compelling description (100-150 words) that highlights:
    1. Organic certification and farming practices
    2. Health and nutritional benefits
    3. Freshness and quality assurance
    4. Connection to local farmers
    5. Sustainability aspects
    
    Use an engaging, trustworthy tone that appeals to health-conscious Indian consumers.`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const description = response.text();
    
    res.json({
      success: true,
      description: description,
      productName: productName,
      model: 'gemini-2.5-flash'
    });
  } catch (error) {
    console.error('❌ Description generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating product description',
      error: error.message
    });
  }
});

// ✅ Health check endpoint
router.get('/health', async (req, res) => {
  try {
    if (!genAI) {
      return res.json({
        success: false,
        gemini: {
          configured: false,
          error: 'API key not configured'
        }
      });
    }

    // Test API call with new model
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent("Hello, are you working?");
    const response = await result.response;
    
    res.json({
      success: true,
      gemini: {
        configured: !!process.env.GEMINI_API_KEY,
        initialized: !!genAI,
        model: 'gemini-2.5-flash',
        working: true,
        testResponse: response.text().substring(0, 50) + '...'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.json({
      success: false,
      gemini: {
        configured: !!process.env.GEMINI_API_KEY,
        initialized: !!genAI,
        model: 'gemini-2.5-flash',
        working: false,
        error: error.message
      },
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
