'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCart } from '@/context/CartContext'
import { recommendationAPI } from '@/utils/recommendationAPI'
import { productAPI } from '@/utils/api'
import ProductRecommendations from '@/components/ProductRecommendations'
import toast from 'react-hot-toast'

interface AIRecommendation {
  _id: string
  name: string
  price: number
  unit: string
  description?: string
  farmer?: {
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

interface APIProduct {
  _id: string
  name: string
  price: number
  unit: string
  quantity: number
  maxQuantity?: number
  farmer?: {
    name: string
    _id: string
  } | null
}

interface Product {
  _id: string
  name: string
  price: number
  unit: string
  quantity: number
  maxQuantity?: number
  farmer: {
    name: string
    _id: string
  }
}

export default function CartPage() {
  const [user, setUser] = useState<User | null>(null)
  const [availableProducts, setAvailableProducts] = useState<Product[]>([])
  const [aiRecommendations, setAiRecommendations] = useState<AIRecommendation[]>([])
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  
  const { 
    cartItems, 
    removeFromCart, 
    updateQuantity, 
    clearCart, 
    getTotalPrice,
    addToCart
  } = useCart()

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      const parsedUser = JSON.parse(userData) as User
      setUser(parsedUser)
      
      if (parsedUser.role !== 'customer') {
        router.push('/')
        return
      }
    } else {
      router.push('/login')
      return
    }

    fetchAvailableProducts()
    if (cartItems.length > 0) {
      fetchAIRecommendations()
    }
  }, [router, cartItems.length])

  const fetchAvailableProducts = async () => {
    try {
      const response = await productAPI.getAll({})
      let productsArray: APIProduct[] = []
      
      if (response?.data?.data && Array.isArray(response.data.data)) {
        productsArray = response.data.data
      } else if (response?.data?.success && Array.isArray(response.data.data)) {
        productsArray = response.data.data
      } else if (Array.isArray(response.data)) {
        productsArray = response.data
      } else {
        productsArray = []
      }
      
      const products: Product[] = productsArray.map((product: APIProduct): Product => ({
        _id: product._id,
        name: product.name,
        price: product.price,
        unit: product.unit,
        quantity: product.quantity,
        maxQuantity: product.quantity,
        farmer: product.farmer || { name: 'Local Farmer', _id: 'unknown' }
      }))
      
      setAvailableProducts(products)
    } catch (error) {
      setAvailableProducts([])
    }
  }

  const fetchAIRecommendations = async () => {
    try {
      setLoading(true)
      const response = await recommendationAPI.getPersonalized('cart', 6)
      if (response.success) {
        setAiRecommendations(response.recommendations)
      }
    } catch (error) {
    } finally {
      setLoading(false)
    }
  }

  const handleAISuggestion = (productName: string) => {
    const suggestedProduct = availableProducts.find(product => 
      product.name.toLowerCase().includes(productName.toLowerCase()) ||
      productName.toLowerCase().includes(product.name.toLowerCase())
    )

    if (suggestedProduct) {
      addToCart(suggestedProduct, 1)
      toast.success(`Added ${suggestedProduct.name} to cart`)
    } else {
      toast.error(`${productName} not currently available`)
    }
  }

  const handleCheckout = () => {
    if (cartItems.length === 0) {
      toast.error('Your cart is empty')
      return
    }
    
    const purchaseHistory = JSON.parse(localStorage.getItem('purchaseHistory') || '[]')
    cartItems.forEach(item => {
      if (!purchaseHistory.includes(item.name)) {
        purchaseHistory.unshift(item.name)
      }
    })
    localStorage.setItem('purchaseHistory', JSON.stringify(purchaseHistory.slice(0, 20)))
    
    router.push('/checkout')
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Shopping Cart</h1>

        {cartItems.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-md">
            <div className="text-6xl mb-4">🛒</div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              Your cart is empty
            </h3>
            <p className="text-gray-600 mb-6">
              Browse our fresh organic products and add them to your cart
            </p>
            <button
              onClick={() => router.push('/products')}
              className="bg-green-600 text-white px-8 py-3 rounded-md hover:bg-green-700"
            >
              Start Shopping
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-6 border-b bg-gray-50">
                  <div className="flex justify-between items-center">
                    <h2 className="text-lg font-semibold">
                      Cart Items ({cartItems.length})
                    </h2>
                    <button
                      onClick={clearCart}
                      className="text-red-600 text-sm hover:text-red-800"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                <div className="divide-y divide-gray-200">
                  {cartItems.map((item) => (
                    <div key={item._id} className="p-6">
                      <div className="flex items-center space-x-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-lg flex items-center justify-center">
                          <span className="text-white text-2xl">🥕</span>
                        </div>

                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-800">
                            {item.name}
                          </h3>
                          <p className="text-sm text-gray-600">
                            By {item.farmer?.name || 'Local Farmer'}
                          </p>
                          <p className="text-green-600 font-semibold">
                            ₹{item.price}/{item.unit}
                          </p>
                        </div>

                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() => updateQuantity(item._id, item.quantity - 1)}
                            className="bg-gray-200 w-8 h-8 rounded-full hover:bg-gray-300 flex items-center justify-center"
                          >
                            -
                          </button>
                          <span className="font-semibold min-w-[2rem] text-center">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item._id, item.quantity + 1)}
                            disabled={item.quantity >= (item.maxQuantity || 999)}
                            className="bg-gray-200 w-8 h-8 rounded-full hover:bg-gray-300 flex items-center justify-center disabled:opacity-50"
                          >
                            +
                          </button>
                        </div>

                        <div className="text-right">
                          <p className="font-semibold text-lg">
                            ₹{(item.price * item.quantity).toFixed(2)}
                          </p>
                          <button
                            onClick={() => removeFromCart(item._id)}
                            className="text-red-600 text-sm hover:text-red-800"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {aiRecommendations.length > 0 && (
                <div className="bg-gradient-to-br from-blue-50 to-green-50 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                    <span className="text-2xl mr-2">🤖</span>
                    Recommended For You
                    {loading && <span className="ml-2 animate-spin">⏳</span>}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Based on your cart, you might also like:
                  </p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {aiRecommendations.map((product: AIRecommendation, index: number) => (
                      <div key={product._id || index} className="bg-white rounded-lg p-4 shadow-sm">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-lg flex items-center justify-center">
                            <span className="text-white text-lg">🌿</span>
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-800">{product.name}</h4>
                            <p className="text-sm text-green-600">₹{product.price}/{product.unit}</p>
                          </div>
                          <button
                            onClick={() => handleAISuggestion(product.name)}
                            className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-md p-6 sticky top-4">
                <h2 className="text-lg font-semibold mb-4">Order Summary</h2>
                
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>₹{getTotalPrice().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Delivery:</span>
                    <span>₹50.00</span>
                  </div>
                  <div className="border-t pt-3">
                    <div className="flex justify-between font-semibold text-lg">
                      <span>Total:</span>
                      <span>₹{(getTotalPrice() + 50).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleCheckout}
                  className="w-full bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 font-semibold mb-3"
                >
                  Proceed to Checkout
                </button>

                <button
                  onClick={() => router.push('/products')}
                  className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-md hover:bg-gray-200"
                >
                  Continue Shopping
                </button>

                <div className="mt-6 text-sm text-gray-600 space-y-1">
                  <p className="flex items-center">
                    <span className="text-green-500 mr-2">✓</span>
                    Fresh organic products
                  </p>
                  <p className="flex items-center">
                    <span className="text-green-500 mr-2">✓</span>
                    Direct from farmers
                  </p>
                  <p className="flex items-center">
                    <span className="text-green-500 mr-2">✓</span>
                    Quality guaranteed
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {cartItems.length > 0 && (
          <div className="mt-12">
            <ProductRecommendations
              type="personalized"
              context="cart-page"
              title="Complete Your Order"
              limit={6}
            />
          </div>
        )}
      </div>
    </div>
  )
}
