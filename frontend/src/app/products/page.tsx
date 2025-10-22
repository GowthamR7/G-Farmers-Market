'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { productAPI, geminiAPI } from '@/utils/api'
import ProductCard from '@/components/ProductCard'
import AISearchAssistant from '@/components/AISearchAssistant'

// ✅ Interface for raw API data (where properties might be optional/missing)
interface APIProduct {
  _id: string
  name: string
  description: string
  price: number
  category: string
  unit: string
  quantity?: number
  isOrganic: boolean
  farmer?: {
    name: string
    _id: string
  } | null
}

// ✅ Fixed: Updated Product interface to match ProductCard requirements
interface Product {
  _id: string
  name: string
  description: string
  price: number
  category: string
  unit: string
  quantity: number  // ✅ Added required quantity property
  isOrganic: boolean
  farmer: {  // ✅ Made farmer required to match ProductCard
    name: string
    _id: string
  }
}

interface User {
  _id: string
  name: string
  email: string
  role: string
}

interface AISuggestions {
  searchSuggestions: string[]
  complementaryProducts: string[]
  seasonalTips: string
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestions | null>(null)
  const [personalizedProducts, setPersonalizedProducts] = useState<string[]>([])
  const [user, setUser] = useState<User | null>(null)
  
  const searchParams = useSearchParams()
  const router = useRouter()

  const fetchProducts = useCallback(async (search = '', cat = 'all') => {
    try {
      setLoading(true)
      const params: { search?: string; category?: string } = {}
      if (search) params.search = search
      if (cat !== 'all') params.category = cat
      
      const response = await productAPI.getAll(params)
      
      console.log('📦 Products API response:', response.data)
      
      // ✅ Handle different response structures
      let apiProductsArray: APIProduct[] = []
      
      if (Array.isArray(response.data)) {
        apiProductsArray = response.data
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        apiProductsArray = response.data.data
      } else if (response.data?.products && Array.isArray(response.data.products)) {
        apiProductsArray = response.data.products
      } else {
        console.warn('⚠️ Unexpected API response structure:', response.data)
        apiProductsArray = []
      }
      
      // ✅ Transform API products to match ProductCard requirements
      const productsArray: Product[] = apiProductsArray.map((apiProduct: APIProduct): Product => ({
        _id: apiProduct._id,
        name: apiProduct.name,
        description: apiProduct.description,
        price: apiProduct.price,
        category: apiProduct.category,
        unit: apiProduct.unit,
        quantity: apiProduct.quantity || 0, // ✅ Default to 0 if missing
        isOrganic: apiProduct.isOrganic,
        farmer: apiProduct.farmer || { name: 'Local Farmer', _id: 'unknown' } // ✅ Default farmer if missing
      }))
      
      console.log('✅ Products array:', productsArray.length, 'items')
      setProducts(productsArray)
      
      // ✅ Get AI suggestions for search results
      if (search && productsArray.length > 0) {
        await getAISearchSuggestions(search, productsArray)
      }
    } catch (error) {
      console.error('❌ Error fetching products:', error)
      setProducts([]) // ✅ Always set to array on error
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchPersonalizedRecommendations = useCallback(async () => {
    try {
      const userPurchaseHistory = JSON.parse(localStorage.getItem('purchaseHistory') || '[]')
      const userSearchHistory = JSON.parse(localStorage.getItem('searchHistory') || '[]')
      
      const prompt = `
        User purchase history: ${userPurchaseHistory.join(', ')}
        User search history: ${userSearchHistory.join(', ')}
        User role: ${user?.role}
        Current season: ${new Date().toLocaleString('default', { month: 'long' })}
        
        As an AI assistant for organic farmers market, recommend 4 products that:
        1. Match user's previous interests
        2. Are suitable for current season
        3. Complement their farming/cooking needs
        4. Introduce them to new organic varieties
        
        Return only product names that would typically be available in an organic market.
        Format as JSON array: ["product1", "product2", "product3", "product4"]
      `
      
      const response = await geminiAPI.getFarmingAdvice({ 
        query: prompt,
        type: 'personalized_recommendations' 
      })
      
      if (response.data?.advice) {
        try {
          const recommendations = JSON.parse(response.data.advice)
          if (Array.isArray(recommendations)) {
            setPersonalizedProducts(recommendations)
          }
        } catch (parseError) {
          console.log('Personalized recommendations parsing error:', parseError)
        }
      }
    } catch (error) {
      console.error('Error fetching personalized recommendations:', error)
    }
  }, [user?.role])

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      setUser(JSON.parse(userData))
    }
    
    const searchFromParams = searchParams.get('search') || ''
    const categoryFromParams = searchParams.get('category') || 'all'
    
    setSearchQuery(searchFromParams)
    setCategory(categoryFromParams)
    
    fetchProducts(searchFromParams, categoryFromParams)
    
    // Get personalized recommendations if user is logged in
    if (userData) {
      fetchPersonalizedRecommendations()
    }
  }, [searchParams, fetchProducts, fetchPersonalizedRecommendations])

  // ✅ AI-Powered Search Suggestions
  const getAISearchSuggestions = async (query: string, currentProducts: Product[]) => {
    try {
      const productNames = currentProducts.map(p => p.name).join(', ')
      
      const prompt = `
        User searched for: "${query}"
        Available products: ${productNames}
        
        As an organic farming marketplace AI assistant, provide:
        1. 3 alternative search suggestions based on the query
        2. Complementary products they might need
        3. Seasonal recommendations for organic farming
        
        Format as JSON: {
          "searchSuggestions": ["suggestion1", "suggestion2", "suggestion3"],
          "complementaryProducts": ["product1", "product2"],
          "seasonalTips": "brief seasonal advice"
        }
      `
      
      const response = await geminiAPI.getFarmingAdvice({ 
        query: prompt,
        type: 'search_suggestions' 
      })
      
      if (response.data?.advice) {
        try {
          const suggestions = JSON.parse(response.data.advice)
          setAiSuggestions(suggestions)
        } catch (parseError) {
          console.log('AI response parsing error:', parseError)
        }
      }
    } catch (error) {
      console.error('Error getting AI suggestions:', error)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Save search to history
    const searchHistory = JSON.parse(localStorage.getItem('searchHistory') || '[]')
    if (searchQuery && !searchHistory.includes(searchQuery)) {
      searchHistory.unshift(searchQuery)
      localStorage.setItem('searchHistory', JSON.stringify(searchHistory.slice(0, 10)))
    }
    
    const params = new URLSearchParams()
    if (searchQuery) params.set('search', searchQuery)
    if (category !== 'all') params.set('category', category)
    
    router.push(`/products?${params.toString()}`)
  }

  const categories = [
    { value: 'all', label: '🌱 All Products' },
    { value: 'vegetables', label: '🥬 Vegetables' },
    { value: 'fruits', label: '🍎 Fruits' },
    { value: 'grains', label: '🌾 Grains' },
    { value: 'dairy', label: '🥛 Dairy' },
    { value: 'herbs', label: '🌿 Herbs' }
  ]

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            🌱 Fresh Organic Products
          </h1>
          <p className="text-lg text-gray-600">
            Discover fresh, organic produce directly from local farmers
          </p>
        </div>

        {/* ✅ AI-Enhanced Search Bar */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="🔍 Search for organic products... (e.g., 'fresh tomatoes', 'winter vegetables')"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-lg"
                />
              </div>
              <div>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                className="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 font-semibold"
              >
                🤖 AI Search
              </button>
            </div>

            {/* ✅ AI Search Suggestions */}
            {aiSuggestions?.searchSuggestions && (
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-semibold text-blue-800 mb-2">🤖 AI Suggestions:</h4>
                <div className="flex flex-wrap gap-2 mb-3">
                  {aiSuggestions.searchSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setSearchQuery(suggestion)}
                      className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm hover:bg-blue-200"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
                {aiSuggestions.seasonalTips && (
                  <p className="text-sm text-blue-700">
                    <strong>Seasonal Tip:</strong> {aiSuggestions.seasonalTips}
                  </p>
                )}
              </div>
            )}
          </form>
        </div>

        {/* ✅ Personalized Recommendations */}
        {user && personalizedProducts.length > 0 && (
          <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-6 mb-8">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">
              🎯 Recommended For You
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {personalizedProducts.map((productName, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setSearchQuery(productName)}
                  className="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow text-center border-2 border-transparent hover:border-green-300"
                >
                  <div className="text-2xl mb-2">🌱</div>
                  <p className="text-sm font-medium text-gray-800">{productName}</p>
                  <p className="text-xs text-green-600">AI Recommended</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Products Grid */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold text-gray-800">
              {searchQuery ? `Search Results for "${searchQuery}"` : 'All Products'}
              <span className="text-green-600 ml-2">
                ({Array.isArray(products) ? products.length : 0} products)
              </span>
            </h2>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array(8).fill(0).map((_, index) => (
                <div key={index} className="bg-white rounded-lg shadow-md p-4 animate-pulse">
                  <div className="bg-gray-200 h-48 rounded-lg mb-4"></div>
                  <div className="bg-gray-200 h-4 rounded mb-2"></div>
                  <div className="bg-gray-200 h-3 rounded mb-4"></div>
                  <div className="bg-gray-200 h-6 rounded w-20"></div>
                </div>
              ))}
            </div>
          ) : !Array.isArray(products) || products.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow-md">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">No products found</h3>
              <p className="text-gray-600 mb-6">
                Try searching for different keywords or browse all products
              </p>
              <button
                onClick={() => { 
                  setSearchQuery(''); 
                  setCategory('all'); 
                  fetchProducts('', 'all'); 
                }}
                className="bg-green-600 text-white px-6 py-3 rounded-md hover:bg-green-700"
              >
                Show All Products
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          )}
        </div>

        {/* ✅ AI Chat Assistant */}
        <AISearchAssistant />
      </div>
    </div>
  )
}
