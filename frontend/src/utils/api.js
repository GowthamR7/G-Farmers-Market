import axios from 'axios'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
// const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://raj-farmers-market-api.onrender.com/api'


const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    console.log(' API Request:', {
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


api.interceptors.response.use(
  (response) => {
    console.log(' API Response:', {
      status: response.status,
      url: response.config.url,
      success: response.data?.success
    })
    return response
  },
  (error) => {
    console.error(' API Error:', {
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


export const authAPI = {
  login: (credentials) => {
    console.log('Login attempt:', { email: credentials.email })
    return api.post('/auth/login', credentials)
  },
  register: (userData) => {
    console.log(' Register attempt:', { email: userData.email, role: userData.role })
    return api.post('/auth/register', userData)
  },
  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    window.dispatchEvent(new Event('authChange'))
  }
}


export const productAPI = {
  getAll: (params) => api.get('/products', { params }),
  create: (productData) => {
    console.log(' Creating product with data:', productData)
    return api.post('/products', productData)
  },
  getById: (id) => api.get(`/products/${id}`),
  update: (id, productData) => {
    console.log(' Updating product:', id, productData)
    return api.put(`/products/${id}`, productData)
  },
  delete: (id) => {
    console.log(' Deleting product:', id)
    return api.delete(`/products/${id}`)
  }
}



export const orderAPI = {
  create: (orderData) => {
    console.log(' Creating order with data:', orderData)
    return api.post('/orders', orderData)
  },
  getMyOrders: () => {
    console.log(' Getting my orders')
    return api.get('/orders/my-orders')
  },
  getFarmerOrders: () => {
    console.log(' Getting farmer orders')
    return api.get('/orders/farmer-orders')
  },
  getById: (id) => api.get(`/orders/${id}`),
  updateStatus: (id, status) => {
    console.log(` Updating order ${id} status to:`, status)
    return api.put(`/orders/${id}/status`, { status })
  }
}




export const geminiAPI = {
  getFarmingAdvice: (data) => {
    console.log(' Getting farming advice:', data)
    return api.post('/gemini/farming-advice', data)
  },
  generateDescription: (data) => {
    console.log('Generating description with data:', data)
    return api.post('/gemini/generate-description', data)
  }
}


export const storyAPI = {
  getAll: (params) => api.get('/stories', { params }),
  create: (storyData) => {
    console.log(' Creating story with data:', storyData)
    return api.post('/stories', storyData)
  },
  getById: (id) => api.get(`/stories/${id}`),
  update: (id, storyData) => api.put(`/stories/${id}`, storyData),
  delete: (id) => api.delete(`/stories/${id}`)
}

export default api