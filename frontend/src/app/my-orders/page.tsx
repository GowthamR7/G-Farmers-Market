'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { orderAPI } from '@/utils/api'

export default function MyOrdersPage() {
  const [user, setUser] = useState(null)
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      const parsedUser = JSON.parse(userData)
      setUser(parsedUser)
      
      if (parsedUser.role !== 'customer') {
        router.push('/')
        return
      }
      
      fetchOrders()
    } else {
      router.push('/login')
    }
  }, [router])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const response = await orderAPI.getMyOrders()
      setOrders(response.data || [])
    } catch (error) {
      console.error('Error fetching orders:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    const statusColors = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'confirmed': 'bg-blue-100 text-blue-800', 
      'preparing': 'bg-purple-100 text-purple-800',
      'ready': 'bg-green-100 text-green-800',
      'delivered': 'bg-green-200 text-green-900',
      'cancelled': 'bg-red-100 text-red-800'
    }
    return statusColors[status] || 'bg-gray-100 text-gray-800'
  }

  const getStatusIcon = (status: string) => {
    const statusIcons = {
      'pending': '⏳',
      'confirmed': '✅',
      'preparing': '👨‍🍳',
      'ready': '📦',
      'delivered': '🚚',
      'cancelled': '❌'
    }
    return statusIcons[status] || '📋'
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-green-50 rounded-lg p-6 mb-8">
          <h1 className="text-3xl font-bold text-green-800 mb-2">
            📋 My Orders
          </h1>
          <p className="text-green-600">
            Track your fresh produce orders from local farmers
          </p>
        </div>

        {loading ? (
          <div className="space-y-4">
            {Array(3).fill(0).map((_, index) => (
              <div key={index} className="bg-white rounded-lg shadow-md p-6 animate-pulse">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="bg-gray-200 h-6 w-32 rounded mb-2"></div>
                    <div className="bg-gray-200 h-4 w-24 rounded"></div>
                  </div>
                  <div className="bg-gray-200 h-6 w-16 rounded"></div>
                </div>
                <div className="space-y-2">
                  <div className="bg-gray-200 h-4 w-full rounded"></div>
                  <div className="bg-gray-200 h-4 w-3/4 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-md">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              No orders yet
            </h3>
            <p className="text-gray-600 mb-6">
              Start shopping for fresh organic products from local farmers
            </p>
            <button
              onClick={() => router.push('/products')}
              className="bg-green-600 text-white px-8 py-3 rounded-md hover:bg-green-700 font-semibold"
            >
              🌱 Start Shopping
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order: any) => (
              <div key={order._id} className="bg-white rounded-lg shadow-md overflow-hidden">
                {/* Order Header */}
                <div className="bg-gray-50 px-6 py-4 border-b">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800">
                        Order #{order.orderNumber}
                      </h3>
                      <p className="text-sm text-gray-600">
                        📅 Placed on {new Date(order.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'long', 
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(order.status)}`}>
                        <span className="mr-1">{getStatusIcon(order.status)}</span>
                        {order.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Order Items */}
                <div className="p-6">
                  <h4 className="font-semibold text-gray-800 mb-4">Items Ordered:</h4>
                  <div className="space-y-3">
                    {order.items?.map((item: any, index: number) => (
                      <div key={item._id || index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-lg flex items-center justify-center">
                            <span className="text-white text-lg">🥕</span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">{item.productName}</p>
                            <p className="text-sm text-gray-600">
                              Quantity: {item.quantity} {item.unit}
                              {item.farmer?.name && (
                                <span className="ml-2 text-green-600">
                                  • By {item.farmer.name}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-800">
                            ₹{(item.price * item.quantity).toFixed(2)}
                          </p>
                          <p className="text-sm text-gray-500">
                            ₹{item.price}/{item.unit}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Order Summary */}
                <div className="bg-gray-50 px-6 py-4 border-t">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-gray-600">Payment Method</p>
                      <p className="font-medium">💰 Cash on Delivery</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Total Amount</p>
                      <p className="text-xl font-bold text-green-600">
                        ₹{((order.totalAmount || 0) + (order.deliveryFee || 50)).toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-500">
                        (incl. ₹{order.deliveryFee || 50} delivery)
                      </p>
                    </div>
                  </div>

                  {/* Delivery Address */}
                  {order.deliveryAddress && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-sm font-medium text-gray-700 mb-1">📍 Delivery Address:</p>
                      <p className="text-sm text-gray-600">
                        {order.deliveryAddress.street}, {order.deliveryAddress.city}, 
                        {order.deliveryAddress.state} - {order.deliveryAddress.pincode}
                        <br />
                        📞 {order.deliveryAddress.phone}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Support Section */}
        <div className="mt-8 bg-blue-50 rounded-lg p-6 text-center">
          <h3 className="text-lg font-semibold text-blue-800 mb-2">
            🤝 Need Help?
          </h3>
          <p className="text-blue-700 mb-4">
            Have questions about your order or need assistance?
          </p>
          <div className="space-x-4">
            <span className="text-sm text-blue-600">
              📧 support@rajsmarket.com
            </span>
            <span className="text-sm text-blue-600">
              📞 +91 98765 43210
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
