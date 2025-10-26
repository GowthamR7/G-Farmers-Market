'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { orderAPI } from '@/utils/api'

interface User {
  _id: string
  name: string
  email: string
  role: string
}

interface DeliveryAddress {
  street: string
  city: string
  state: string
  pincode: string
  phone: string
}

interface OrderItem {
  _id?: string
  product?: string
  productName: string
  quantity: number
  unit: string
  price: number
  subtotal?: number
  farmer?: {
    name: string
    _id: string
  } | string
}

interface Order {
  _id: string
  orderNumber: string
  status: string
  createdAt: string
  totalAmount: number
  deliveryFee: number
  finalAmount?: number
  items: OrderItem[]
  deliveryAddress: DeliveryAddress
  customer?: {
    _id: string
    name: string
    email: string
  }
  paymentMethod: string
  paymentStatus: string
  notes?: string
}

export default function MyOrdersPage() {
  const [user, setUser] = useState<User | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      const parsedUser = JSON.parse(userData) as User
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
      setError(null)
      
      const response = await orderAPI.getMyOrders()
      
      let ordersArray: Order[] = []
      
      if (response.data?.success && Array.isArray(response.data.data)) {
        ordersArray = response.data.data
      } else if (Array.isArray(response.data)) {
        ordersArray = response.data
      } else if (response.data?.orders && Array.isArray(response.data.orders)) {
        ordersArray = response.data.orders
      } else {
        ordersArray = []
      }
      
      const sortedOrders = ordersArray.sort((a: Order, b: Order) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      
      setOrders(sortedOrders)
      
    } catch (error: any) {
      if (error.response?.status === 401) {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        router.push('/login')
      } else if (error.response?.status === 403) {
        setError('Access denied. Customer account required.')
      } else {
        setError('Failed to load orders. Please try again.')
      }
      
      setOrders([])
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
    return statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'
  }

  const getStatusIcon = (status: string) => {
    const statusIcons = {
      'pending': '⏳',
      'confirmed': '✓',
      'preparing': '👨‍🍳',
      'ready': '📦',
      'delivered': '🚚',
      'cancelled': '❌'
    }
    return statusIcons[status as keyof typeof statusIcons] || '📋'
  }

  const refreshOrders = () => {
    fetchOrders()
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p>Loading user session...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-green-50 rounded-lg p-6 mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-green-800 mb-2">
                My Orders
              </h1>
              <p className="text-green-600">
                Track your fresh produce orders from local farmers
              </p>
            </div>
            <button
              onClick={refreshOrders}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center space-x-2"
            >
              <span>⟲</span>
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <span className="text-red-500 text-xl mr-2">⚠</span>
              <div>
                <h3 className="font-semibold text-red-800">Error Loading Orders</h3>
                <p className="text-red-700">{error}</p>
              </div>
            </div>
            <button
              onClick={refreshOrders}
              className="mt-3 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Try Again
            </button>
          </div>
        )}

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
              Start Shopping
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order: Order) => (
              <div key={order._id} className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="bg-gray-50 px-6 py-4 border-b">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800">
                        Order #{order.orderNumber}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Placed on {new Date(order.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'long', 
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(order.status)}`}>
                        <span className="mr-1">{getStatusIcon(order.status)}</span>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                      <p className="text-sm text-gray-500 mt-1">
                        Payment: {order.paymentStatus}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <h4 className="font-semibold text-gray-800 mb-4">
                    Items Ordered ({order.items.length}):
                  </h4>
                  <div className="space-y-3">
                    {order.items.map((item: OrderItem, index: number) => {
                      const farmerName = typeof item.farmer === 'string' 
                        ? 'Local Farmer' 
                        : item.farmer?.name || 'Local Farmer'
                      
                      return (
                        <div key={item._id || index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                          <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-lg flex items-center justify-center">
                              <span className="text-white text-lg">🥕</span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-800">{item.productName}</p>
                              <p className="text-sm text-gray-600">
                                Quantity: {item.quantity} {item.unit}
                                <span className="ml-2 text-green-600">
                                  • By {farmerName}
                                </span>
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-gray-800">
                              ₹{(item.subtotal || (item.price * item.quantity)).toFixed(2)}
                            </p>
                            <p className="text-sm text-gray-500">
                              ₹{item.price}/{item.unit}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="bg-gray-50 px-6 py-4 border-t">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <p className="text-sm text-gray-600">Payment Method</p>
                      <p className="font-medium">
                        {order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment'}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>Subtotal:</span>
                          <span>₹{order.totalAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Delivery:</span>
                          <span>₹{order.deliveryFee.toFixed(2)}</span>
                        </div>
                        <div className="border-t pt-1">
                          <div className="flex justify-between">
                            <span className="font-semibold">Total:</span>
                            <span className="text-xl font-bold text-green-600">
                              ₹{(order.totalAmount + order.deliveryFee).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-200">
                    <p className="text-sm font-medium text-gray-700 mb-2">Delivery Address:</p>
                    <div className="bg-white p-3 rounded border">
                      <p className="text-sm text-gray-800">
                        {order.deliveryAddress.street}
                      </p>
                      <p className="text-sm text-gray-800">
                        {order.deliveryAddress.city}, {order.deliveryAddress.state} - {order.deliveryAddress.pincode}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        Phone: {order.deliveryAddress.phone}
                      </p>
                    </div>
                  </div>

                  {order.notes && (
                    <div className="pt-3">
                      <p className="text-sm font-medium text-gray-700 mb-1">Special Instructions:</p>
                      <p className="text-sm text-gray-600 bg-white p-2 rounded border">
                        {order.notes}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 bg-blue-50 rounded-lg p-6 text-center">
          <h3 className="text-lg font-semibold text-blue-800 mb-2">
            Need Help?
          </h3>
          <p className="text-blue-700 mb-4">
            Have questions about your order or need assistance?
          </p>
          <div className="flex justify-center space-x-6 text-sm">
            <a href="mailto:support@farmersmarket.com" className="text-blue-600 hover:text-blue-800">
              support@farmersmarket.com
            </a>
            <span className="text-blue-600">
              +91 98765 43210
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
