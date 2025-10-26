'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

function OrderSuccessContent() {
  const [orderNumber, setOrderNumber] = useState('')
  const [loading, setLoading] = useState(true)
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    try {
      const orderId = searchParams.get('orderId')
      
      if (orderId) {
        setOrderNumber(orderId)
        setLoading(false)
      } else {
        setTimeout(() => {
          router.push('/')
        }, 2000)
      }
    } catch (error) {
      setLoading(false)
    }
  }, [searchParams, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading order details...</p>
        </div>
      </div>
    )
  }

  if (!orderNumber) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-4xl mb-4">⚠</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">No Order Found</h1>
          <p className="text-gray-600 mb-4">Redirecting to home page...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 min-h-screen">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8 animate-fadeIn">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
            <div className="text-5xl">✓</div>
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Order Placed Successfully!
          </h1>
          <p className="text-lg text-gray-600">
            Thank you for supporting our local farmers
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Order Details</h2>
          <div className="bg-gradient-to-r from-green-50 to-green-100 p-6 rounded-lg border-2 border-green-200">
            <p className="text-sm text-gray-600 mb-1">Order Number</p>
            <p className="text-2xl font-bold text-green-700 mb-3">#{orderNumber}</p>
            <div className="flex items-center text-sm text-green-600">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Order confirmation sent to your email</span>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 rounded-lg p-6 mb-6 border border-blue-200">
          <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center">
            <span className="text-2xl mr-2">📋</span>
            What's Next?
          </h3>
          <div className="space-y-3">
            <div className="flex items-start">
              <div className="bg-blue-100 rounded-full p-2 mr-3 mt-1">
                <span className="text-xl">1</span>
              </div>
              <div>
                <p className="font-semibold text-blue-900">Order Confirmation</p>
                <p className="text-sm text-blue-700">We're processing your order now</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="bg-blue-100 rounded-full p-2 mr-3 mt-1">
                <span className="text-xl">2</span>
              </div>
              <div>
                <p className="font-semibold text-blue-900">Preparation</p>
                <p className="text-sm text-blue-700">Farmers will prepare your fresh products</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="bg-blue-100 rounded-full p-2 mr-3 mt-1">
                <span className="text-xl">3</span>
              </div>
              <div>
                <p className="font-semibold text-blue-900">Delivery</p>
                <p className="text-sm text-blue-700">Your order will be delivered within 1-2 days</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="bg-blue-100 rounded-full p-2 mr-3 mt-1">
                <span className="text-xl">4</span>
              </div>
              <div>
                <p className="font-semibold text-blue-900">Payment</p>
                <p className="text-sm text-blue-700">Pay cash on delivery</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <Link 
            href="/my-orders"
            className="block w-full bg-green-600 text-white py-4 px-6 rounded-lg hover:bg-green-700 font-semibold text-center transition-colors shadow-md hover:shadow-lg"
          >
            Track Your Order
          </Link>
          <Link 
            href="/products"
            className="block w-full bg-white text-green-600 py-4 px-6 rounded-lg hover:bg-gray-50 font-semibold text-center border-2 border-green-600 transition-colors"
          >
            Continue Shopping
          </Link>
          <Link 
            href="/"
            className="block w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-lg hover:bg-gray-200 font-medium text-center transition-colors"
          >
            Back to Home
          </Link>
        </div>

        <div className="mt-8 text-center p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600 mb-2">Need help with your order?</p>
          <p className="text-sm font-medium text-gray-800">Contact us at support@farmersmarket.com</p>
          <p className="text-sm text-gray-600 mt-1">or call us at +91 9876543210</p>
        </div>
      </div>
    </div>
  )
}

function OrderSuccessLoading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading order details...</p>
      </div>
    </div>
  )
}

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={<OrderSuccessLoading />}>
      <OrderSuccessContent />
    </Suspense>
  )
}
