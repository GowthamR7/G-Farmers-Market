import api from './api';

export const recommendationAPI = {

  getPersonalized: async (context = 'general', limit = 6) => {
    try {
      const response = await api.get(`/recommendations/personalized`, {
        params: { context, limit }
      });
      return response.data;
    } catch (error) {
      console.error('Error getting personalized recommendations:', error);
      return { success: false, recommendations: [] };
    }
  },


  getRelated: async (productId, limit = 4) => {
    try {
      const response = await api.get(`/recommendations/related/${productId}`, {
        params: { limit }
      });
      return response.data;
    } catch (error) {
      console.error('Error getting related products:', error);
      return { success: false, relatedProducts: [] };
    }
  },


  getTrending: async (limit = 6) => {
    try {
      const response = await api.get(`/recommendations/trending`, {
        params: { limit }
      });
      return response.data;
    } catch (error) {
      console.error('Error getting trending products:', error);
      return { success: false, trendingProducts: [] };
    }
  },


  trackSearch: async (query, results = []) => {
    try {
      await api.post('/recommendations/track-search', { query, results });
    } catch (error) {
      console.error('Error tracking search:', error);
    }
  },


  trackView: async (productId, category) => {
    try {
      await api.post('/recommendations/track-view', { productId, category });
    } catch (error) {
      console.error('Error tracking product view:', error);
    }
  }
};
