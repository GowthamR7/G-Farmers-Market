'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCart } from '@/context/CartContext'
import { orderAPI } from '@/utils/api'
import toast from 'react-hot-toast'

interface DeliveryAddress {
  street: string
  city: string
  state: string
  pincode: string
  phone: string
}

interface User {
  _id: string
  name: string
  email: string
  role: string
}

interface APIError {
  response?: {
    data?: {
      message?: string
      errors?: string[]
    }
    status?: number
  }
  request?: unknown
  message?: string
}

export default function CheckoutPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1)
  const router = useRouter()
  const { cartItems, getTotalPrice, clearCart } = useCart()

  const [deliveryAddress, setDeliveryAddress] = useState<DeliveryAddress>({
    street: '',
    city: '',
    state: 'Tamil Nadu',
    pincode: '',
    phone: ''
  })

  const [paymentMethod, setPaymentMethod] = useState('cod')
  const [notes, setNotes] = useState('')

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

    if (cartItems.length === 0) {
      toast.error('Your cart is empty')
      router.push('/products')
    }
  }, [cartItems, router])

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setDeliveryAddress(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleNextStep = () => {
    if (step === 1) {
      if (!deliveryAddress.street || !deliveryAddress.city || !deliveryAddress.pincode || !deliveryAddress.phone) {
        toast.error('Please fill all delivery address fields')
        return
      }
    }
    setStep(step + 1)
  }

  const handlePrevStep = () => {
    setStep(step - 1)
  }

  const handlePlaceOrder = async () => {
    setLoading(true)
    
    try {
      console.log('🛒 Starting order placement...');
      
      // Validate cart
      if (!cartItems || cartItems.length === 0) {
        toast.error('Your cart is empty')
        router.push('/products')
        return
      }
  
      // Validate delivery address
      const addressErrors = []
      if (!deliveryAddress.street?.trim()) addressErrors.push('Street address')
      if (!deliveryAddress.city?.trim()) addressErrors.push('City')
      if (!deliveryAddress.pincode?.trim()) addressErrors.push('Pincode')
      if (!deliveryAddress.phone?.trim()) addressErrors.push('Phone number')
  
      if (addressErrors.length > 0) {
        toast.error(`Please fill: ${addressErrors.join(', ')}`)
        setStep(1)
        return
      }
  
      // Validate pincode format
      if (!/^\d{6}$/.test(deliveryAddress.pincode.trim())) {
        toast.error('Pincode must be 6 digits')
        setStep(1)
        return
      }
  
      // Validate phone format
      if (!/^\d{10}$/.test(deliveryAddress.phone.trim())) {
        toast.error('Phone number must be 10 digits')
        setStep(1)
        return
      }
  
      console.log('✅ Pre-validation passed');
      console.log('📦 Cart items:', cartItems);
      
      // Prepare Order Data - matching backend expectations exactly
      const orderData = {
        items: cartItems.map((item) => ({
          productId: item._id,
          productName: item.name,
          quantity: parseInt(item.quantity.toString()),
          price: parseFloat(item.price.toString()),
          unit: item.unit
        })),
        deliveryAddress: {
          street: deliveryAddress.street.trim(),
          city: deliveryAddress.city.trim(),
          state: deliveryAddress.state.trim(),
          pincode: deliveryAddress.pincode.trim(),
          phone: deliveryAddress.phone.trim()
        },
        paymentMethod: paymentMethod,
        notes: notes?.trim() || ''
      };
  
      console.log('📤 Sending order data:', orderData);
  
      // Make API Request
      const response = await orderAPI.create(orderData);
      
      console.log('✅ Order Response:', response.data);
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Order creation failed');
      }
  
      const order = response.data.order;
      const orderNumber = order.orderNumber;
      
      console.log('✅ Order placed successfully:', orderNumber);
      
      // Clear cart FIRST
      clearCart()
      
      // Show success toast
      toast.success('Order placed successfully!')
      
      // Use window.location for hard navigation to ensure page loads
      console.log('🚀 Navigating to success page with orderNumber:', orderNumber);
      window.location.href = `/order-success?orderId=${orderNumber}`
      
    } catch (error: unknown) {
      console.error('❌ Order placement error:', error);
      
      const apiError = error as APIError
      
      if (apiError.response) {
        const errorData = apiError.response.data;
        const status = apiError.response.status;
        
        console.error('Server error:', status, errorData);
        
        if (status === 400 && errorData?.errors?.length) {
          // Show validation errors
          errorData.errors.slice(0, 3).forEach((err: string) => {
            toast.error(err, { duration: 5000 });
          });
          if (errorData.errors.length > 3) {
            toast.error(`...and ${errorData.errors.length - 3} more issues`, { duration: 3000 });
          }
        } else if (status === 401) {
          toast.error('Please login to place orders');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          router.push('/login');
        } else if (status === 403) {
          toast.error('Access denied. Customer account required.');
          router.push('/');
        } else {
          toast.error(errorData?.message || 'Order placement failed');
        }
      } else if (apiError.request) {
        toast.error('Network error. Check your connection.');
      } else {
        toast.error(apiError.message || 'Order placement failed');
      }
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Checkout</h1>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                  step >= s 
                    ? 'bg-green-600 text-white' 
                    : 'bg-gray-300 text-gray-600'
                }`}>
                  {s}
                </div>
                {s < 3 && (
                  <div className={`w-16 h-1 mx-2 ${
                    step > s ? 'bg-green-600' : 'bg-gray-300'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-sm text-gray-600 px-4">
            <span>Address</span>
            <span>Payment</span>
            <span>Review</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Step 1: Delivery Address */}
            {step === 1 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold mb-6">Delivery Address</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Street Address *
                    </label>
                    <input
                      type="text"
                      name="street"
                      value={deliveryAddress.street}
                      onChange={handleAddressChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="Enter your street address"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        City *
                      </label>
                      <input
                        type="text"
                        name="city"
                        value={deliveryAddress.city}
                        onChange={handleAddressChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        placeholder="City"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        State *
                      </label>
                      <select
                        name="state"
                        value={deliveryAddress.state}
                        onChange={handleAddressChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      >
                        <option value="Tamil Nadu">Tamil Nadu</option>
                        <option value="Karnataka">Karnataka</option>
                        <option value="Kerala">Kerala</option>
                        <option value="Andhra Pradesh">Andhra Pradesh</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Pincode *
                      </label>
                      <input
                        type="text"
                        name="pincode"
                        value={deliveryAddress.pincode}
                        onChange={handleAddressChange}
                        required
                        pattern="[0-9]{6}"
                        maxLength={6}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        placeholder="600001"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone Number *
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={deliveryAddress.phone}
                        onChange={handleAddressChange}
                        required
                        pattern="[0-9]{10}"
                        maxLength={10}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        placeholder="9876543210"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={handleNextStep}
                    className="bg-green-600 text-white px-6 py-3 rounded-md hover:bg-green-700 font-semibold"
                  >
                    Continue to Payment
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Payment Method */}
            {step === 2 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold mb-6">Payment Method</h2>
                
                <div className="space-y-4">
                  <div className="border rounded-lg p-4 bg-green-50 border-green-300">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="payment"
                        value="cod"
                        checked={paymentMethod === 'cod'}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="w-4 h-4 text-green-600 focus:ring-green-500"
                      />
                      <span className="ml-3">
                        <strong className="text-green-800">Cash on Delivery (COD)</strong>
                        <p className="text-sm text-green-700">Pay when your order arrives</p>
                      </span>
                    </label>
                  </div>

                  <div className="border rounded-lg p-4 opacity-50 bg-gray-50">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="payment"
                        value="online"
                        disabled
                        className="w-4 h-4 text-green-600"
                      />
                      <span className="ml-3">
                        <strong>Online Payment</strong>
                        <p className="text-sm text-gray-600">Coming Soon</p>
                      </span>
                    </label>
                  </div>
                </div>

                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Special Instructions (Optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Any special delivery instructions..."
                  />
                </div>

                <div className="mt-6 flex justify-between">
                  <button
                    onClick={handlePrevStep}
                    className="bg-gray-300 text-gray-700 px-6 py-3 rounded-md hover:bg-gray-400 font-semibold"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleNextStep}
                    className="bg-green-600 text-white px-6 py-3 rounded-md hover:bg-green-700 font-semibold"
                  >
                    Review Order
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Review Order */}
            {step === 3 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold mb-6">Review Your Order</h2>
                
                <div className="space-y-4 mb-6">
                  {cartItems.map((item) => (
                    <div key={item._id} className="flex items-center space-x-4 p-4 border rounded-lg">
                      <div className="w-12 h-12 bg-green-400 rounded-lg flex items-center justify-center text-2xl">
                        🥕
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold">{item.name}</h4>
                        <p className="text-sm text-gray-600">By {item.farmer?.name || 'Local Farmer'}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">₹{(item.price * item.quantity).toFixed(2)}</p>
                        <p className="text-sm text-gray-600">{item.quantity} {item.unit}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <h4 className="font-semibold mb-2">Delivery Address</h4>
                  <p className="text-gray-700 text-sm">
                    {deliveryAddress.street}<br />
                    {deliveryAddress.city}, {deliveryAddress.state} - {deliveryAddress.pincode}<br />
                    Phone: {deliveryAddress.phone}
                  </p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg mb-6">
                  <h4 className="font-semibold mb-2">Payment Method</h4>
                  <p className="text-gray-700">Cash on Delivery</p>
                </div>

                <div className="flex justify-between">
                  <button
                    onClick={handlePrevStep}
                    disabled={loading}
                    className="bg-gray-300 text-gray-700 px-6 py-3 rounded-md hover:bg-gray-400 font-semibold disabled:opacity-50"
                  >
                    Back
                  </button>
                  <button
                    onClick={handlePlaceOrder}
                    disabled={loading}
                    className="bg-green-600 text-white px-6 py-3 rounded-md hover:bg-green-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Placing Order...' : 'Place Order'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-4">
              <h3 className="text-lg font-semibold mb-4">Order Summary</h3>
              
              <div className="space-y-3 mb-4">
                <div className="flex justify-between text-sm">
                  <span>Subtotal ({cartItems.length} items)</span>
                  <span>₹{getTotalPrice().toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Delivery Fee</span>
                  <span>₹50.00</span>
                </div>
                <div className="border-t pt-3">
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Total</span>
                    <span className="text-green-600">₹{(getTotalPrice() + 50).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="text-xs text-gray-600 space-y-1">
                <p>✓ Fresh organic products</p>
                <p>✓ Direct from farmers</p>
                <p>✓ Quality guaranteed</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
