const { geminiAPI } = require('../services/GeminiService');

const getFarmingAdvice = async (req, res) => {
  try {
    if (!geminiAPI.isConfigured()) {
      return res.status(500).json({
        success: false,
        message: 'Gemini API not configured'
      });
    }

    const { query, type } = req.body;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Query is required'
      });
    }

    let enhancedPrompt = query;
    
    switch (type) {
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

    const response = await geminiAPI.getFarmingAdvice({
      query: enhancedPrompt,
      type
    });

    res.json({
      success: true,
      advice: response.data.advice,
      type: type || 'general',
      model: 'gemini-2.5-flash',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    let errorMessage = 'Error generating AI advice';
    let statusCode = 500;
    
    if (error.message?.includes('API key')) {
      errorMessage = 'Invalid or missing API key';
      statusCode = 401;
    } else if (error.message?.includes('quota')) {
      errorMessage = 'API quota exceeded. Please try again later.';
      statusCode = 429;
    }
    
    res.status(statusCode).json({
      success: false,
      message: errorMessage,
      error: error.message
    });
  }
};

const generateDescription = async (req, res) => {
  try {
    const { productName, category, features } = req.body;
    
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
    
    const response = await geminiAPI.getFarmingAdvice({
      query: prompt,
      type: 'description_generation'
    });
    
    res.json({
      success: true,
      description: response.data.advice,
      productName: productName,
      model: 'gemini-2.5-flash'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error generating product description',
      error: error.message
    });
  }
};

const healthCheck = async (req, res) => {
  try {
    if (!geminiAPI.isConfigured()) {
      return res.json({
        success: false,
        gemini: {
          configured: false,
          error: 'API key not configured'
        }
      });
    }

    const response = await geminiAPI.getFarmingAdvice({
      query: "Hello, are you working?",
      type: 'health_check'
    });
    
    res.json({
      success: true,
      gemini: {
        configured: true,
        initialized: true,
        model: 'gemini-2.5-flash',
        working: true,
        testResponse: response.data.advice.substring(0, 50) + '...'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.json({
      success: false,
      gemini: {
        configured: true,
        initialized: true,
        model: 'gemini-2.5-flash',
        working: false,
        error: error.message
      },
      timestamp: new Date().toISOString()
    });
  }
};

module.exports = { getFarmingAdvice, generateDescription, healthCheck };
