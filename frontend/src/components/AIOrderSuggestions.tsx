'use client'
import { useState, useEffect, useCallback } from 'react'
import { geminiAPI } from '@/utils/api'

interface CartItem {
  _id: string
  name: string
  price: number
  unit: string
  quantity: number
  farmer?: {
    name: string
    _id: string
  }
}

interface AISuggestions {
  complementaryProducts?: string[]
  nutritionTips?: string
  seasonalSuggestions?: string[]
  cookingTips?: string
  totalValue?: string
  farmingTips?: string
}

interface AIOrderSuggestionsProps {
  cartItems: CartItem[]
  onAddSuggestion: (suggestion: string) => void
}

export default function AIOrderSuggestions({ cartItems, onAddSuggestion }: AIOrderSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<AISuggestions | null>(null)
  const [loading, setLoading] = useState(false)

  const generateOrderSuggestions = useCallback(async () => {
    try {
      setLoading(true)
      
      const cartSummary = cartItems.map(item => 
        `${item.name} (${item.quantity} ${item.unit})`
      ).join(', ')

      const userHistory = JSON.parse(localStorage.getItem('purchaseHistory') || '[]')
      const currentSeason = new Date().toLocaleString('default', { month: 'long' })

      const prompt = `
        User's current cart: ${cartSummary}
        Previous purchases: ${userHistory.join(', ')}
        Current season: ${currentSeason}
        
        As an AI assistant for organic farming marketplace, analyze this cart and suggest:
        
        1. Complementary products that go well with current items
        2. Missing essentials for balanced nutrition
        3. Seasonal products they should consider
        4. Storage/preservation tips
        5. Cooking combinations

        Return as JSON:
        {
          "complementaryProducts": ["product1", "product2", "product3"],
          "nutritionTips": "brief nutrition advice",
          "seasonalSuggestions": ["seasonal1", "seasonal2"],
          "cookingTips": "cooking/storage advice",
          "totalValue": "estimated total nutritional value",
          "farmingTips": "if user might be a farmer, suggest what to grow next"
        }
      `

      const response = await geminiAPI.getFarmingAdvice({
        query: prompt,
        type: 'order_analysis'
      })

      if (response.data?.advice) {
        try {
          const parsedSuggestions = JSON.parse(response.data.advice) as AISuggestions
          setSuggestions(parsedSuggestions)
        } catch (parseError) {
          console.error('Error parsing AI suggestions:', parseError)
        }
      }
    } catch (error) {
      console.error('Error generating order suggestions:', error)
    } finally {
      setLoading(false)
    }
  }, [cartItems])

  useEffect(() => {
    if (cartItems.length > 0) {
      generateOrderSuggestions()
    }
  }, [cartItems, generateOrderSuggestions])

  if (cartItems.length === 0) return null

  return (
    <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-lg p-6 mb-6">
      <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
        <span className="text-2xl mr-2">🤖</span>
        AI Order Assistant
      </h3>

      {loading ? (
        <div className="animate-pulse">
          <div className="bg-gray-200 h-4 rounded mb-3"></div>
          <div className="bg-gray-200 h-4 rounded mb-3 w-3/4"></div>
          <div className="bg-gray-200 h-4 rounded w-1/2"></div>
        </div>
      ) : suggestions ? (
        <div className="space-y-4">
          {/* Complementary Products */}
          {suggestions.complementaryProducts && (
            <div>
              <h4 className="font-semibold text-green-800 mb-2">
                🛒 You might also like:
              </h4>
              <div className="flex flex-wrap gap-2">
                {suggestions.complementaryProducts.map((product: string, index: number) => (
                  <button
                    key={index}
                    onClick={() => onAddSuggestion(product)}
                    className="bg-white text-green-700 px-3 py-1 rounded-full text-sm hover:bg-green-100 border border-green-200"
                  >
                    + {product}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Nutrition Tips */}
          {suggestions.nutritionTips && (
            <div className="bg-white rounded-lg p-4">
              <h4 className="font-semibold text-blue-800 mb-2">
                🥗 Nutrition Insight:
              </h4>
              <p className="text-sm text-gray-700">{suggestions.nutritionTips}</p>
            </div>
          )}

          {/* Seasonal Suggestions */}
          {suggestions.seasonalSuggestions && (
            <div>
              <h4 className="font-semibold text-orange-800 mb-2">
                🍂 Perfect for this season:
              </h4>
              <div className="flex flex-wrap gap-2">
                {suggestions.seasonalSuggestions.map((item: string, index: number) => (
                  <span
                    key={index}
                    className="bg-orange-100 text-orange-700 px-2 py-1 rounded-full text-sm"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Cooking Tips */}
          {suggestions.cookingTips && (
            <div className="bg-yellow-50 rounded-lg p-4">
              <h4 className="font-semibold text-yellow-800 mb-2">
                👨‍🍳 Cooking & Storage Tips:
              </h4>
              <p className="text-sm text-gray-700">{suggestions.cookingTips}</p>
            </div>
          )}

          {/* Farming Tips for Farmers */}
          {suggestions.farmingTips && (
            <div className="bg-green-100 rounded-lg p-4">
              <h4 className="font-semibold text-green-800 mb-2">
                🌱 For Farmers - Growing Tips:
              </h4>
              <p className="text-sm text-gray-700">{suggestions.farmingTips}</p>
            </div>
          )}
        </div>
      ) : (
        <p className="text-gray-600">Getting AI suggestions for your order...</p>
      )}
    </div>
  )
}
