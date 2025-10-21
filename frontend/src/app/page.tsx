'use client'
import { useState, useEffect } from 'react'
import { productAPI } from '@/utils/api'
import ProductCard from '@/components/ProductCard'
import Link from 'next/link'

export default function Home() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchFeaturedProducts()
  }, [])

  const fetchFeaturedProducts = async () => {
    try {
      setLoading(true)
      const response = await productAPI.getAll({ limit: 6 })
      
      console.log('📦 Products response:', response.data)
      
      // ✅ Handle different response structures
      let productsArray = []
      
      if (Array.isArray(response.data)) {
        // Response is directly an array
        productsArray = response.data
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        // Response has a nested data property
        productsArray = response.data.data
      } else if (response.data?.products && Array.isArray(response.data.products)) {
        // Response has a products property
        productsArray = response.data.products
      }
      
      // ✅ Ensure each product has a valid _id
      const validProducts = productsArray
        .filter((product: any) => product._id)
        .slice(0, 6)
      
      console.log('✅ Valid products:', validProducts.length)
      setProducts(validProducts)
    } catch (error) {
      console.error('❌ Error fetching products:', error)
      setProducts([]) // Set empty array on error
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-green-600 to-green-800 text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl font-bold mb-6">
            🌱 Raj's Online Farmers Market
          </h1>
          <p className="text-xl mb-8 max-w-2xl mx-auto">
            Fresh, organic produce directly from local farmers to your table. 
            Supporting sustainable agriculture and healthy living.
          </p>
          <div className="space-x-4">
            <Link 
              href="/products"
              className="bg-white text-green-600 px-8 py-3 rounded-lg font-semibold hover:bg-green-50 inline-block"
            >
              Shop Now
            </Link>
            <Link 
              href="/register"
              className="border border-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-green-600 inline-block"
            >
              Join as Farmer
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-800">
            Why Choose Raj's Market?
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                id: 'feature-1',
                icon: '🌿',
                title: 'Organic & Fresh',
                description: 'Certified organic produce harvested at peak freshness'
              },
              {
                id: 'feature-2', 
                icon: '👨‍🌾',
                title: 'Direct from Farmers',
                description: 'Connect directly with local farmers, supporting rural communities'
              },
              {
                id: 'feature-3',
                icon: '🚛',
                title: 'Fast Delivery',
                description: 'Quick delivery within 24-48 hours of harvest'
              }
            ].map((feature) => (
              <div key={feature.id} className="bg-white rounded-lg shadow-md p-6 text-center">
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold mb-3 text-gray-800">
                  {feature.title}
                </h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16 bg-gray-100">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-800">
            Featured Products
          </h2>
          
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array(6).fill(0).map((_, index) => (
                <div key={`loading-${index}`} className="bg-white rounded-lg shadow-md p-4 animate-pulse">
                  <div className="bg-gray-200 h-48 rounded-lg mb-4"></div>
                  <div className="bg-gray-200 h-4 rounded mb-2"></div>
                  <div className="bg-gray-200 h-3 rounded mb-4"></div>
                  <div className="bg-gray-200 h-6 rounded w-20"></div>
                </div>
              ))}
            </div>
          ) : products.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product: any) => (
                <ProductCard 
                  key={product._id}
                  product={product} 
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-600 text-lg mb-4">No products available yet.</p>
              <Link 
                href="/register"
                className="text-green-600 hover:text-green-700 font-semibold"
              >
                Be the first farmer to list products! →
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-16 bg-green-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6">
            Ready to Experience Fresh, Organic Living?
          </h2>
          <p className="text-xl mb-8">
            Join thousands of satisfied customers who trust Raj's Market for their daily fresh needs.
          </p>
          <Link 
            href="/register"
            className="bg-white text-green-600 px-8 py-3 rounded-lg font-semibold hover:bg-green-50 inline-block"
          >
            Get Started Today
          </Link>
        </div>
      </section>
    </div>
  )
}