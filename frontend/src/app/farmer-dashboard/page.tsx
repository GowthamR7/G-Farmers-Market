'use client'
import { useState, useEffect } from 'react'
import { productAPI, geminiAPI } from '@/utils/api'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

interface User {
  _id: string
  name: string
  email: string
  role: string
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
  createdAt: string
  farmer?: {
    _id: string
    name: string
  }
}

interface APIError {
  response?: {
    data?: {
      message?: string
    }
    status?: number
  }
  message?: string
}

export default function FarmerDashboard() {
  const [user, setUser] = useState<User | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [activeTab, setActiveTab] = useState('products')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: 'vegetables',
    unit: 'kg',
    quantity: '1', // ✅ Added missing quantity field
    isOrganic: true
  })

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      const parsedUser = JSON.parse(userData) as User
      setUser(parsedUser)
      
      if (parsedUser.role !== 'farmer') {
        router.push('/products')
        return
      }
      
      fetchMyProducts()
    } else {
      router.push('/login')
    }
  }, [router])

  const fetchMyProducts = async () => {
    try {
      const response = await productAPI.getAll({})
      console.log('API Response:', response)
      
      // ✅ Fixed user ID comparison
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}') as User
      const myProducts = response.data?.filter((product: Product) => 
        product.farmer?._id === currentUser._id // Fixed: use _id instead of id
      ) || []
      
      setProducts(myProducts)
      console.log('My Products:', myProducts)
    } catch (error) {
      console.error('Error fetching products:', error)
      toast.error('Failed to fetch products')
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }))
  }

  const generateDescription = async () => {
    if (!formData.name) {
      toast.error('Please enter product name first')
      return
    }

    try {
      setLoading(true)
      const response = await geminiAPI.generateDescription({
        productName: formData.name,
        category: formData.category,
        features: `Organic: ${formData.isOrganic}, Price: ₹${formData.price}/${formData.unit}`
      })
      
      if (response.data?.description) {
        setFormData(prev => ({
          ...prev,
          description: response.data.description
        }))
        toast.success('AI generated description successfully!')
      } else {
        throw new Error('No description received')
      }
    } catch (error) {
      console.error('Error generating description:', error)
      toast.error('Failed to generate description')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // ✅ Enhanced validation
    if (!formData.name || !formData.description || !formData.price || !formData.quantity) {
      toast.error('Please fill all required fields')
      return
    }

    if (parseFloat(formData.price) <= 0) {
      toast.error('Price must be greater than 0')
      return
    }

    if (parseInt(formData.quantity) <= 0) {
      toast.error('Quantity must be greater than 0')
      return
    }

    try {
      setLoading(true)
      console.log('Submitting form data:', formData)
      
      // ✅ Properly formatted data
      const productData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        price: parseFloat(formData.price),
        quantity: parseInt(formData.quantity),
        category: formData.category,
        unit: formData.unit,
        isOrganic: formData.isOrganic
      }
      
      console.log('Product data to send:', productData)
      
      const response = await productAPI.create(productData)
      console.log('Create product response:', response)
      
      toast.success('Product added to marketplace successfully! 🎉')
      setShowAddForm(false)
      
      // ✅ Reset form
      setFormData({
        name: '',
        description: '',
        price: '',
        category: 'vegetables',
        unit: 'kg',
        quantity: '1',
        isOrganic: true
      })
      
      // Refresh products list
      fetchMyProducts()
    } catch (error: unknown) {
      console.error('Error adding product:', error)
      
      const apiError = error as APIError
      
      // ✅ Enhanced error handling
      if (apiError.response?.data?.message) {
        toast.error(apiError.response.data.message)
      } else if (apiError.response?.status === 401) {
        toast.error('Authentication failed. Please login again.')
        router.push('/login')
      } else if (apiError.response?.status === 403) {
        toast.error('Access denied. Only farmers can add products.')
      } else {
        toast.error('Failed to add product. Please try again.')
      }
    } finally {
      setLoading(false)
    }
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
      {/* Welcome Header */}
      <div className="bg-green-50 rounded-lg p-6 mb-8">
        <h1 className="text-3xl font-bold text-green-800 mb-2">
          Welcome back, {user.name}! 🌾
        </h1>
        <p className="text-green-600">
          Manage your farm products, share your farming stories, and connect with customers
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-4 mb-8 border-b">
        {[
          { key: 'products', label: '🥕 My Products', desc: 'Manage marketplace listings' },
          { key: 'harvest', label: '📅 Weekly Harvest', desc: 'Update harvest schedule' },
          { key: 'stories', label: '📖 Farming Stories', desc: 'Share your methods' }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`pb-4 px-2 border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-600 hover:text-green-600'
            }`}
          >
            <div className="text-center">
              <div className="font-semibold">{tab.label}</div>
              <div className="text-xs">{tab.desc}</div>
            </div>
          </button>
        ))}
      </div>

      {/* Products Tab */}
      {activeTab === 'products' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">My Marketplace Products</h2>
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-green-600 text-white px-6 py-3 rounded-md hover:bg-green-700 flex items-center space-x-2"
            >
              <span>➕</span>
              <span>Add New Product</span>
            </button>
          </div>

          {/* Add Product Form */}
          {showAddForm && (
            <div className="bg-white p-6 rounded-lg shadow-md mb-8 border border-green-200">
              <h3 className="text-xl font-semibold mb-4 text-green-800">📝 Add New Product to Marketplace</h3>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Product Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      placeholder="e.g., Organic Tomatoes"
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    >
                      <option value="vegetables">🥕 Vegetables</option>
                      <option value="fruits">🍎 Fruits</option>
                      <option value="grains">🌾 Grains</option>
                      <option value="herbs">🌿 Herbs</option>
                      <option value="dairy">🥛 Dairy</option>
                      <option value="others">📦 Others</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Price (₹) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="price"
                      value={formData.price}
                      onChange={handleInputChange}
                      required
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Unit</label>
                    <select
                      name="unit"
                      value={formData.unit}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    >
                      <option value="kg">Kilogram (kg)</option>
                      <option value="pieces">Piece</option>
                      <option value="liters">Litre</option>
                      <option value="dozen">Dozen</option>
                    </select>
                  </div>

                  {/* ✅ Added Quantity Field */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Available Quantity <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="quantity"
                      value={formData.quantity}
                      onChange={handleInputChange}
                      required
                      min="1"
                      placeholder="1"
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Product Description <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={generateDescription}
                      disabled={!formData.name || loading}
                      className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                    >
                      {loading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Generating...</span>
                        </>
                      ) : (
                        <>
                          <span>🤖</span>
                          <span>Generate with AI</span>
                        </>
                      )}
                    </button>
                  </div>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    required
                    rows={4}
                    placeholder="Describe your product for customers..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>

                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    name="isOrganic"
                    checked={formData.isOrganic}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                  />
                  <label className="text-sm font-medium text-gray-700">
                    ✅ This product is organically grown (certified)
                  </label>
                </div>

                <div className="flex space-x-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-green-600 text-white px-6 py-3 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Adding...</span>
                      </>
                    ) : (
                      <>
                        <span>✅</span>
                        <span>Add to Marketplace</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="bg-gray-400 text-white px-6 py-3 rounded-md hover:bg-gray-500"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Products Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product: Product) => (
              <div key={product._id} className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-bold text-lg text-gray-800">{product.name}</h3>
                  {product.isOrganic && (
                    <span className="bg-green-100 text-green-800 text-xs px-3 py-1 rounded-full">
                      ✅ Organic
                    </span>
                  )}
                </div>
                
                <p className="text-gray-600 text-sm mb-4 line-clamp-3">{product.description}</p>
                
                <div className="flex justify-between items-center mb-2">
                  <span className="text-green-600 font-bold text-xl">
                    ₹{product.price}
                    <span className="text-gray-500 text-sm font-normal">/{product.unit}</span>
                  </span>
                  <span className="bg-blue-100 text-blue-800 text-xs px-3 py-1 rounded-full">
                    {product.category}
                  </span>
                </div>

                <div className="flex justify-between items-center mb-4">
                  <span className="text-gray-600 text-sm">
                    Stock: {product.quantity} {product.unit}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    product.quantity > 0 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {product.quantity > 0 ? 'In Stock' : 'Out of Stock'}
                  </span>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between text-sm text-gray-500">
                  <span>📅 {new Date(product.createdAt).toLocaleDateString()}</span>
                  <span>👀 Live on marketplace</span>
                </div>
              </div>
            ))}
          </div>

          {products.length === 0 && (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <div className="text-6xl mb-4">🌾</div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">No products in marketplace yet</h3>
              <p className="text-gray-600 mb-6">Start by adding your first product to reach customers</p>
              <button
                onClick={() => setShowAddForm(true)}
                className="bg-green-600 text-white px-8 py-3 rounded-md hover:bg-green-700"
              >
                Add Your First Product
              </button>
            </div>
          )}
        </div>
      )}

      {/* Other tabs remain the same */}
      {/* Weekly Harvest Tab */}
      {activeTab === 'harvest' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">📅 Weekly Harvest Schedule</h2>
          <p className="text-gray-600 mb-6">Share your weekly harvest updates with customers</p>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <div className="text-4xl mb-4">🚧</div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Coming Soon!</h3>
            <p className="text-gray-600">Weekly harvest scheduling feature will be available soon.</p>
          </div>
        </div>
      )}

      {/* Farming Stories Tab */}
      {activeTab === 'stories' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">📖 Share Your Farming Stories</h2>
          <p className="text-gray-600 mb-6">Tell customers about your farming methods and experiences</p>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
            <div className="text-4xl mb-4">📝</div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Share Your Story</h3>
            <p className="text-gray-600 mb-4">Feature to share farming methods and stories will be added soon.</p>
            <button className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700" disabled>
              Write Story (Coming Soon)
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
