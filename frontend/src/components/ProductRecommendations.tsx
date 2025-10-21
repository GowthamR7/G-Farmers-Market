'use client'
import { useState, useEffect } from 'react'
import { recommendationAPI } from '@/utils/recommendationAPI'
import ProductCard from './ProductCard'
import { useCart } from '@/context/CartContext'

interface ProductRecommendationsProps {
  type: 'personalized' | 'related' | 'trending'
  productId?: string
  context?: string
  title?: string
  limit?: number
  showAddToCart?: boolean
}

export default function ProductRecommendations({
  type,
  productId,
  context = 'general',
  title,
  limit = 6,
  showAddToCart = true
}: ProductRecommendationsProps) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { addToCart } = useCart()

  useEffect(() => {
    fetchRecommendations()
  }, [type, productId, context, limit])

  const fetchRecommendations = async () => {
    try {
      setLoading(true)
      setError('')

      let response
      switch (type) {
        case 'personalized':
          response = await recommendationAPI.getPersonalized(context, limit)
          setProducts(response.recommendations || [])
          break
        case 'related':
          if (!productId) return
          response = await recommendationAPI.getRelated(productId, limit)
          setProducts(response.relatedProducts || [])
          break
        case 'trending':
          response = await recommendationAPI.getTrending(limit)
          setProducts(response.trendingProducts || [])
          break
      }
    } catch (error) {
      console.error('Error fetching recommendations:', error)
      setError('Failed to load recommendations')
    } finally {
      setLoading(false)
    }
  }

  const handleAddToCart = (product: any) => {
    addToCart(product, 1)
  }

  if (loading) {
    return (
      <div className="my-8">
        <div className="bg-gray-200 h-6 w-48 rounded mb-4 animate-pulse"></div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array(limit).fill(0).map((_, index) => (
            <div key={index} className="bg-white rounded-lg shadow-sm p-4 animate-pulse">
              <div className="bg-gray-200 h-32 rounded mb-3"></div>
              <div className="bg-gray-200 h-4 rounded mb-2"></div>
              <div className="bg-gray-200 h-3 rounded mb-2"></div>
              <div className="bg-gray-200 h-6 rounded w-20"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error || products.length === 0) {
    return null
  }

  const getTitle = () => {
    if (title) return title
    switch (type) {
      case 'personalized': return '🎯 Recommended For You'
      case 'related': return '🔗 Related Products'  
      case 'trending': return '📈 Trending Now'
      default: return '💡 You Might Like'
    }
  }

  return (
    <div className="my-8">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-gray-800">
          {getTitle()}
        </h3>
        <span className="text-sm text-gray-500">
          Based on {type === 'personalized' ? 'your preferences' : 'popular choices'}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {products.map((product: any) => (
          <div key={product._id} className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-4">
            {/* Product Image */}
            <div className="w-full h-32 bg-gradient-to-br from-green-400 to-green-600 rounded-lg mb-3 flex items-center justify-center">
              <span className="text-white text-2xl">🥕</span>
            </div>
            
            {/* Product Info */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-gray-800 line-clamp-2">
                {product.name}
              </h4>
              
              <div className="flex items-center justify-between">
                <span className="text-green-600 font-semibold text-sm">
                  ₹{product.price}/{product.unit}
                </span>
                <span className="text-xs text-gray-500">
                  {product.quantity} available
                </span>
              </div>

              {product.farmer && (
                <p className="text-xs text-gray-500 truncate">
                  By {product.farmer.name}
                </p>
              )}

              {showAddToCart && (
                <button
                  onClick={() => handleAddToCart(product)}
                  className="w-full bg-green-600 text-white text-xs py-2 px-3 rounded hover:bg-green-700 transition-colors"
                >
                  Add to Cart
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
