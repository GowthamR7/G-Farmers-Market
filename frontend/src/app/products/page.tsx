'use client'
import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { productAPI, geminiAPI } from '@/utils/api'
import ProductCard from '@/components/ProductCard'
import AISearchAssistant from '@/components/AISearchAssistant'

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

interface Product {
  _id: string
  name: string
  description: string
  price: number
  category: string
  unit: string
  quantity: number
  isOrganic: boolean
  farmer: {
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

const AI_CACHE_DURATION = 15 * 60 * 1000
const MAX_RETRY_ATTEMPTS = 2

function ProductsPageContent() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestions | null>(null)
  const [personalizedProducts, setPersonalizedProducts] = useState<string[]>([])
  const [user, setUser] = useState<User | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  
  const searchParams = useSearchParams()
  const router = useRouter()

  const getCachedAIResponse = useCallback((cacheKey: string) => {
    try {
      if (typeof window === 'undefined') return null
      
      const cached = localStorage.getItem(`ai_cache_${cacheKey}`)
      if (cached) {
        const { data, timestamp } = JSON.parse(cached)
        if (Date.now() - timestamp < AI_CACHE_DURATION) {
          return data
        } else {
          localStorage.removeItem(`ai_cache_${cacheKey}`)
        }
      }
    } catch (error) {
    }
    return null
  }, [])

  const setCachedAIResponse = useCallback((cacheKey: string, data: any) => {
    try {
      if (typeof window === 'undefined') return
      
      localStorage.setItem(`ai_cache_${cacheKey}`, JSON.stringify({
        data,
        timestamp: Date.now()
      }))
    } catch (error) {
    }
  }, [])

  const callGeminiAPIWithRetry = useCallback(async (requestData: any, retryCount = 0): Promise<any> => {
    try {
      const response = await geminiAPI.getFarmingAdvice(requestData)
      return response.data?.advice
    } catch (error: any) {
      if (error.response?.status === 429) {
        if (retryCount < MAX_RETRY_ATTEMPTS) {
          const delay = Math.pow(2, retryCount) * 3000
          await new Promise(resolve => setTimeout(resolve, delay))
          return callGeminiAPIWithRetry(requestData, retryCount + 1)
        }
      }
      return null
    }
  }, [])

  const fetchProducts = useCallback(async (search: string = '', cat: string = 'all') => {
    try {
      setLoading(true)
      setError(null)
      
      const params: { search?: string; category?: string } = {}
      if (search.trim()) params.search = search.trim()
      if (cat && cat !== 'all') params.category = cat
      
      const response = await productAPI.getAll(params)
      
      if (!response || !response.data) {
        throw new Error('Invalid API response structure')
      }
      
      let apiProductsArray: APIProduct[] = []
      
      if (response.data.success === true && Array.isArray(response.data.data)) {
        apiProductsArray = response.data.data
      } else if (response.data.success === true && Array.isArray(response.data.products)) {
        apiProductsArray = response.data.products
      } else if (Array.isArray(response.data)) {
        apiProductsArray = response.data
      } else if (response.data && typeof response.data === 'object') {
        const possibleArrays = ['data', 'products', 'items', 'result']
        for (const key of possibleArrays) {
          if (Array.isArray(response.data[key])) {
            apiProductsArray = response.data[key]
            break
          }
        }
      }
      
      if (!Array.isArray(apiProductsArray)) {
        throw new Error('Invalid products data structure')
      }
      
      const productsArray: Product[] = apiProductsArray.map((apiProduct: APIProduct, index: number): Product => {
        if (!apiProduct || !apiProduct._id) {
          return { _id: '', name: 'Unknown Product', description: 'No description available', price: 0, category: 'others', unit: 'piece', quantity: 0, isOrganic: false, farmer: { name: 'Local Farmer', _id: 'unknown' } }
        }
        
        return {
          _id: apiProduct._id,
          name: apiProduct.name || 'Unknown Product',
          description: apiProduct.description || 'No description available',
          price: Number(apiProduct.price) || 0,
          category: apiProduct.category || 'others',
          unit: apiProduct.unit || 'piece',
          quantity: Number(apiProduct.quantity) || 0,
          isOrganic: Boolean(apiProduct.isOrganic),
          farmer: apiProduct.farmer || { name: 'Local Farmer', _id: 'unknown' }
        }
      }).filter(Boolean) as Product[]
      
      setProducts(productsArray)
      
      if (search && productsArray.length > 0) {
        setTimeout(() => {
          getAISearchSuggestions(search, productsArray)
        }, 1000)
      }
      
    } catch (error: any) {
      let errorMessage = 'Failed to load products'
      
      if (error.code === 'NETWORK_ERROR' || error.message === 'Network Error') {
        errorMessage = 'Network connection error. Please check your internet connection.'
      } else if (error.response?.status === 500) {
        errorMessage = 'Server error. Please try again later.'
      } else if (error.response?.status === 404) {
        errorMessage = 'Products API not found. Please contact support.'
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      } else if (error.message) {
        errorMessage = error.message
      }
      
      setError(errorMessage)
      setProducts([])
    } finally {
      setLoading(false)
    }
  }, [])

  const getAISearchSuggestions = useCallback(async (query: string, currentProducts: Product[]) => {
    try {
      const cacheKey = `search_${query.toLowerCase().replace(/\s+/g, '_')}`
      const cached = getCachedAIResponse(cacheKey)
      
      if (cached) {
        setAiSuggestions(cached)
        return
      }

      const productNames = currentProducts.slice(0, 15).map(p => p.name).join(', ')
      
      const prompt = `
        User searched: "${query}"
        Available products: ${productNames}
        
        Provide JSON: {
          "searchSuggestions": ["suggestion1", "suggestion2", "suggestion3"],
          "complementaryProducts": ["product1", "product2"],
          "seasonalTips": "brief tip"
        }
      `
      
      const aiResponse = await callGeminiAPIWithRetry({
        query: prompt,
        type: 'search_suggestions'
      })
      
      if (aiResponse) {
        try {
          const suggestions = JSON.parse(aiResponse)
          setAiSuggestions(suggestions)
          setCachedAIResponse(cacheKey, suggestions)
          return
        } catch (parseError) {
        }
      }
      
      const fallbackSuggestions = {
        searchSuggestions: [`Fresh ${query}`, `Organic ${query}`, `Local ${query}`],
        complementaryProducts: ['Organic Vegetables', 'Fresh Herbs'],
        seasonalTips: 'Choose seasonal products for better taste and nutrition.'
      }
      
      setAiSuggestions(fallbackSuggestions)
      
    } catch (error) {
    }
  }, [getCachedAIResponse, setCachedAIResponse, callGeminiAPIWithRetry])

  const fetchPersonalizedRecommendations = useCallback(async (currentUser: User) => {
    try {
      setAiLoading(true)
      
      const cacheKey = `personalized_${currentUser._id}`
      const cached = getCachedAIResponse(cacheKey)
      
      if (cached && Array.isArray(cached)) {
        setPersonalizedProducts(cached)
        return
      }

      const userPurchaseHistory = JSON.parse(localStorage.getItem('purchaseHistory') || '[]')
      const userSearchHistory = JSON.parse(localStorage.getItem('searchHistory') || '[]')
      
      if (userPurchaseHistory.length === 0 && userSearchHistory.length === 0) {
        const fallbackRecommendations = currentUser.role === 'farmer' 
          ? ['Organic Seeds', 'Natural Fertilizer', 'Farming Tools', 'Compost']
          : ['Organic Vegetables', 'Fresh Fruits', 'Whole Grains', 'Natural Dairy']
        
        setPersonalizedProducts(fallbackRecommendations)
        return
      }

      const prompt = `
        User purchase history: ${userPurchaseHistory.slice(0, 8).join(', ') || 'none'}
        User search history: ${userSearchHistory.slice(0, 8).join(', ') || 'none'}
        User role: ${currentUser.role}
        
        Recommend 4 organic products. Return only JSON array: ["product1", "product2", "product3", "product4"]
      `
      
      const aiResponse = await callGeminiAPIWithRetry({
        query: prompt,
        type: 'personalized_recommendations'
      })
      
      if (aiResponse) {
        try {
          const recommendations = JSON.parse(aiResponse)
          if (Array.isArray(recommendations)) {
            setPersonalizedProducts(recommendations)
            setCachedAIResponse(cacheKey, recommendations)
            return
          }
        } catch (parseError) {
        }
      }
      
      const fallbackRecommendations = currentUser.role === 'farmer' 
        ? ['Organic Seeds', 'Natural Fertilizer', 'Farming Tools', 'Compost']
        : ['Organic Tomatoes', 'Fresh Spinach', 'Brown Rice', 'Free-Range Eggs']
      
      setPersonalizedProducts(fallbackRecommendations)
      
    } catch (error) {
      const fallbackRecommendations = ['Organic Vegetables', 'Fresh Fruits', 'Whole Grains', 'Natural Dairy']
      setPersonalizedProducts(fallbackRecommendations)
    } finally {
      setAiLoading(false)
    }
  }, [getCachedAIResponse, setCachedAIResponse, callGeminiAPIWithRetry])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userData = localStorage.getItem('user')
      if (userData) {
        try {
          const parsedUser = JSON.parse(userData)
          setUser(parsedUser)
          
          setTimeout(() => {
            fetchPersonalizedRecommendations(parsedUser)
          }, 3000)
        } catch (error) {
        }
      }
    }
    
    const searchFromParams = searchParams.get('search') || ''
    const categoryFromParams = searchParams.get('category') || 'all'
    
    setSearchQuery(searchFromParams)
    setCategory(categoryFromParams)
    
    fetchProducts(searchFromParams, categoryFromParams)
    
  }, [searchParams, fetchProducts, fetchPersonalizedRecommendations])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (typeof window !== 'undefined') {
      const searchHistory = JSON.parse(localStorage.getItem('searchHistory') || '[]')
      if (searchQuery && !searchHistory.includes(searchQuery)) {
        searchHistory.unshift(searchQuery)
        localStorage.setItem('searchHistory', JSON.stringify(searchHistory.slice(0, 10)))
      }
    }
    
    const params = new URLSearchParams()
    if (searchQuery.trim()) params.set('search', searchQuery.trim())
    if (category && category !== 'all') params.set('category', category)
    
    const queryString = params.toString()
    const newUrl = queryString ? `/products?${queryString}` : '/products'
    
    router.push(newUrl)
  }

  const handleClearSearch = () => {
    setSearchQuery('')
    setCategory('all')
    setAiSuggestions(null)
    router.push('/products')
  }

  const retryFetch = () => {
    const searchFromParams = searchParams.get('search') || ''
    const categoryFromParams = searchParams.get('category') || 'all'
    fetchProducts(searchFromParams, categoryFromParams)
  }

  const categories = [
    { value: 'all', label: 'All Products' },
    { value: 'vegetables', label: 'Vegetables' },
    { value: 'fruits', label: 'Fruits' },
    { value: 'grains', label: 'Grains' },
    { value: 'dairy', label: 'Dairy' },
    { value: 'herbs', label: 'Herbs' }
  ]

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            Fresh Organic Products
          </h1>
          <p className="text-lg text-gray-600">
            Discover fresh, organic produce directly from local farmers
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search for organic products..."
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
                disabled={loading}
                className="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Searching...' : 'Search'}
              </button>
              {(searchQuery || category !== 'all') && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="bg-gray-400 text-white px-6 py-3 rounded-lg hover:bg-gray-500"
                >
                  Clear
                </button>
              )}
            </div>

            {aiSuggestions?.searchSuggestions && (
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-semibold text-blue-800 mb-2">Search Suggestions:</h4>
                <div className="flex flex-wrap gap-2 mb-3">
                  {aiSuggestions.searchSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setSearchQuery(suggestion)}
                      className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm hover:bg-blue-200 transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
                {aiSuggestions.seasonalTips && (
                  <p className="text-sm text-blue-700">
                    <strong>Tip:</strong> {aiSuggestions.seasonalTips}
                  </p>
                )}
              </div>
            )}
          </form>
        </div>

        {user && personalizedProducts.length > 0 && (
          <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-6 mb-8">
            <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
              Recommended For You
              {aiLoading && <span className="ml-2 animate-spin text-sm">⏳</span>}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {personalizedProducts.map((productName, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setSearchQuery(productName)}
                  className="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 text-center border-2 border-transparent hover:border-green-300"
                >
                  <div className="text-2xl mb-2">🌱</div>
                  <p className="text-sm font-medium text-gray-800">{productName}</p>
                  <p className="text-xs text-green-600">Recommended</p>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold text-gray-800">
              {searchQuery ? `Search Results for "${searchQuery}"` : 'All Products'}
              <span className="text-green-600 ml-2">
                ({products.length} products)
              </span>
            </h2>
            {!loading && !error && (
              <button
                onClick={retryFetch}
                className="bg-green-100 text-green-700 px-4 py-2 rounded hover:bg-green-200 text-sm"
              >
                Refresh
              </button>
            )}
          </div>

          {error && !loading && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center mb-6">
              <div className="text-red-500 text-4xl mb-4">⚠️</div>
              <h3 className="text-xl font-semibold text-red-800 mb-2">Error Loading Products</h3>
              <p className="text-red-700 mb-4">{error}</p>
              <button
                onClick={retryFetch}
                className="bg-red-600 text-white px-6 py-3 rounded-md hover:bg-red-700 font-semibold"
              >
                Try Again
              </button>
            </div>
          )}

          {loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array(8).fill(0).map((_, index) => (
                <div key={index} className="bg-white rounded-lg shadow-md p-4 animate-pulse">
                  <div className="bg-gray-200 h-48 rounded-lg mb-4"></div>
                  <div className="bg-gray-200 h-4 rounded mb-2 w-3/4"></div>
                  <div className="bg-gray-200 h-3 rounded mb-4 w-1/2"></div>
                  <div className="bg-gray-200 h-6 rounded w-20"></div>
                </div>
              ))}
            </div>
          )}

          {!loading && !error && products.length === 0 && (
            <div className="text-center py-12 bg-white rounded-lg shadow-md">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">No products found</h3>
              <p className="text-gray-600 mb-6">
                {searchQuery 
                  ? `No products match "${searchQuery}". Try different keywords or browse all products.`
                  : 'No products are currently available. Please check back later.'
                }
              </p>
              <div className="space-x-4">
                {searchQuery && (
                  <button
                    onClick={handleClearSearch}
                    className="bg-green-600 text-white px-6 py-3 rounded-md hover:bg-green-700"
                  >
                    Show All Products
                  </button>
                )}
                <button
                  onClick={retryFetch}
                  className="bg-gray-600 text-white px-6 py-3 rounded-md hover:bg-gray-700"
                >
                  Retry Loading
                </button>
              </div>
            </div>
          )}

          {!loading && !error && products.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          )}
        </div>

        {!loading && <AISearchAssistant />}
      </div>
    </div>
  )
}

function ProductsPageLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <div className="bg-gray-200 h-10 w-64 rounded mb-4 animate-pulse mx-auto"></div>
          <div className="bg-gray-200 h-6 w-96 rounded animate-pulse mx-auto"></div>
        </div>
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
      </div>
    </div>
  )
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<ProductsPageLoading />}>
      <ProductsPageContent />
    </Suspense>
  )
}
