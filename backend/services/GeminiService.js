const { GoogleGenerativeAI } = require('@google/generative-ai');

class GeminiService {
  constructor() {
    this.genAI = process.env.GEMINI_API_KEY 
      ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
      : null;
  }

  async getFarmingAdvice(requestData) {
    try {
      if (!this.genAI) {
        throw new Error('Gemini API not configured');
      }

      const model = this.genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash"
      });

      const result = await model.generateContent(requestData.query);
      const response = await result.response;
      const text = response.text();

      return {
        success: true,
        data: {
          advice: text,
          type: requestData.type || 'general',
          model: 'gemini-2.5-flash'
        }
      };
    } catch (error) {
      throw error;
    }
  }

  isConfigured() {
    return !!this.genAI;
  }
}

const geminiAPI = new GeminiService();
module.exports = { geminiAPI, GeminiService };
