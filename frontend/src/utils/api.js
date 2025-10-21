import axios from 'axios'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// ✅ Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    console.log('🔍 API Request:', {
      method: config.method,
      url: config.url,
      hasAuth: !!config.headers.Authorization
    })
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// ✅ Response interceptor for better error handling
api.interceptors.response.use(
  (response) => {
    console.log('✅ API Response:', {
      status: response.status,
      url: response.config.url,
      success: response.data?.success
    })
    return response
  },
  (error) => {
    console.error('❌ API Error:', {
      status: error.response?.status,
      message: error.response?.data?.message,
      url: error.config?.url
    })
    
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    
    return Promise.reject(error)
  }
)

// ✅ Auth API
export const authAPI = {
  login: (credentials) => {
    console.log('🔐 Login attempt:', { email: credentials.email })
    return api.post('/auth/login', credentials)
  },
  register: (userData) => {
    console.log('📝 Register attempt:', { email: userData.email, role: userData.role })
    return api.post('/auth/register', userData)
  },
  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    window.dispatchEvent(new Event('authChange'))
  }
}

// ✅ Product API
export const productAPI = {
  getAll: (params) => api.get('/products', { params }),
  create: (productData) => {
    console.log('📝 Creating product with data:', productData)
    return api.post('/products', productData)
  },
  getById: (id) => api.get(`/products/${id}`),
  update: (id, productData) => api.put(`/products/${id}`, productData),
  delete: (id) => api.delete(`/products/${id}`)
}

// ✅ Order API
export const orderAPI = {
  create: (orderData) => {
    console.log('📦 Creating order with data:', orderData)
    return api.post('/orders', orderData)
  },
  getAll: (params) => api.get('/orders', { params }),
  getById: (id) => api.get(`/orders/${id}`),
  getByOrderNumber: (orderNumber) => api.get(`/orders/number/${orderNumber}`),
  updateStatus: (id, status) => {
    console.log(`📝 Updating order ${id} status to:`, status)
    return api.put(`/orders/${id}/status`, { status })
  },
  cancel: (id) => {
    console.log(`❌ Cancelling order ${id}`)
    return api.put(`/orders/${id}/cancel`)
  }
}

// ✅ Gemini API
export const geminiAPI = {
  getFarmingAdvice: (data) => {
    console.log('🤖 Getting farming advice:', data)
    return api.post('/gemini/farming-advice', data)
  },
  generateDescription: (data) => {
    console.log('🤖 Generating description with data:', data)
    return api.post('/gemini/generate-description', data)
  }
}

// ✅ Story API (if you have farmer stories feature)
export const storyAPI = {
  getAll: (params) => api.get('/stories', { params }),
  create: (storyData) => {
    console.log('📖 Creating story with data:', storyData)
    return api.post('/stories', storyData)
  },
  getById: (id) => api.get(`/stories/${id}`),
  update: (id, storyData) => api.put(`/stories/${id}`, storyData),
  delete: (id) => api.delete(`/stories/${id}`)
}

export default api