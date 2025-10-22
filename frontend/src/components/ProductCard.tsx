import { ShoppingCart, User } from 'lucide-react'
import { useCart } from '@/context/CartContext'
import { useState } from 'react'
import Image from 'next/image'

interface Product {
  _id: string
  name: string
  description: string
  price: number
  category: string
  farmer: {
    _id?: string
    name: string
    email?: string
  } | null
  isOrganic: boolean
  unit: string
  quantity: number
  images?: string[]
}

interface ProductCardProps {
  product: Product
  onView?: () => void
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addToCart } = useCart()
  const [quantity, setQuantity] = useState(1)
  
  // Check if user is logged in and is customer
  const user = typeof window !== 'undefined' 
    ? JSON.parse(localStorage.getItem('user') || 'null') 
    : null
  
  const isCustomer = user?.role === 'customer'
  const farmerName = product.farmer?.name || 'Local Farmer'

  const handleAddToCart = () => {
    if (!isCustomer) {
      alert('Please login as customer to add items to cart')
      return
    }
    
    // ✅ Transform product to match CartContext expectations
    const cartProduct = {
      _id: product._id,
      name: product.name,
      price: product.price,
      unit: product.unit,
      quantity: product.quantity,
      farmer: product.farmer || { name: 'Local Farmer', _id: 'unknown' }
    }
    
    addToCart(cartProduct, quantity)
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      {/* Product Image */}
      <div className="h-48 bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center relative">
        {product.images && product.images.length > 0 ? (
          <Image
            src={product.images[0]}
            alt={product.name}
            fill
            className="object-cover"
          />
        ) : (
          <div className="text-white text-6xl">🥕</div>
        )}
      </div>

      {/* Product Info */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-lg text-gray-800 line-clamp-1">
            {product.name}
          </h3>
          {product.isOrganic && (
            <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full whitespace-nowrap">
              Organic
            </span>
          )}
        </div>

        <p className="text-gray-600 text-sm mb-3 line-clamp-2">
          {product.description}
        </p>

        <div className="flex items-center mb-3">
          <User className="h-4 w-4 text-gray-400 mr-1" />
          <span className="text-sm text-gray-600">
            By {farmerName}
          </span>
        </div>

        {/* Price and Stock Info */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <span className="text-2xl font-bold text-green-600">
              ₹{product.price}
            </span>
            <span className="text-gray-500 text-sm ml-1">
              /{product.unit}
            </span>
          </div>
          <span className="text-sm text-gray-500">
            {product.quantity} {product.unit} available
          </span>
        </div>

        {/* Quantity Selector (Only for customers) */}
        {isCustomer && (
          <div className="flex items-center space-x-2 mb-4">
            <span className="text-sm font-medium text-gray-700">Qty:</span>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="bg-gray-200 w-8 h-8 rounded-full hover:bg-gray-300 flex items-center justify-center"
              >
                -
              </button>
              <span className="font-semibold min-w-[2rem] text-center">
                {quantity}
              </span>
              <button
                onClick={() => setQuantity(Math.min(product.quantity, quantity + 1))}
                className="bg-gray-200 w-8 h-8 rounded-full hover:bg-gray-300 flex items-center justify-center"
              >
                +
              </button>
            </div>
          </div>
        )}

        {/* Add to Cart Button */}
        <button
          onClick={handleAddToCart}
          disabled={!isCustomer || product.quantity === 0}
          className={`w-full py-2 px-4 rounded-md flex items-center justify-center space-x-2 transition-colors ${
            isCustomer && product.quantity > 0
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          <ShoppingCart className="h-4 w-4" />
          <span>
            {!isCustomer 
              ? 'Login to Buy' 
              : product.quantity === 0 
                ? 'Out of Stock'
                : `Add ${quantity} ${product.unit}`
            }
          </span>
        </button>

        {/* Category Badge */}
        <div className="mt-3 pt-3 border-t border-gray-100">
          <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
            {product.category}
          </span>
        </div>
      </div>
    </div>
  )
}
