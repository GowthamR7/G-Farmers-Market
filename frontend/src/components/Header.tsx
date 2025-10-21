'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useCart } from '@/context/CartContext'
import toast from 'react-hot-toast'

export default function Header() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()
  const { getTotalItems } = useCart()

  useEffect(() => {
    checkAuthStatus()
    
    const handleStorageChange = () => {
      checkAuthStatus()
    }
    
    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('authChange', handleStorageChange)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('authChange', handleStorageChange)
    }
  }, [pathname])

  const checkAuthStatus = () => {
    try {
      const token = localStorage.getItem('token')
      const userData = localStorage.getItem('user')
      
      if (token && userData) {
        const parsedUser = JSON.parse(userData)
        setUser(parsedUser)
      } else {
        setUser(null)
      }
    } catch (error) {
      console.error('Error checking auth status:', error)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
    toast.success('Logged out successfully')
    window.dispatchEvent(new Event('authChange'))
    router.push('/')
  }

  if (loading) {
    return (
      <header className="bg-green-600 text-white shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">🌱</span>
              <span className="text-xl font-bold">Raj's Market</span>
            </div>
            <div>Loading...</div>
          </div>
        </div>
      </header>
    )
  }

  return (
    <header className="bg-green-600 text-white shadow-lg">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-2xl">🌱</span>
            <span className="text-xl font-bold">Raj's Market</span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
  <Link href="/" className="hover:text-green-200">
    Home
  </Link>
  <Link href="/products" className="hover:text-green-200">
    Products
  </Link>
  {user?.role === 'farmer' && (
    <Link href="/farmer-dashboard" className="hover:text-green-200">
      Dashboard
    </Link>
  )}
  {user?.role === 'customer' && (
    <Link href="/my-orders" className="hover:text-green-200">
      My Orders
    </Link>
  )}
</nav>

          {/* User Actions */}
          <div className="flex items-center space-x-4">
            {/* Shopping Cart - Only for customers */}
            {user?.role === 'customer' && (
              <Link href="/cart" className="relative hover:text-green-200">
                <span className="text-xl">🛒</span>
                {getTotalItems() > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {getTotalItems()}
                  </span>
                )}
              </Link>
            )}

            {user ? (
              <div className="flex items-center space-x-4">
                <span className="text-sm">
                  Welcome, <strong>{user.name}</strong>
                  <span className="ml-1 text-xs bg-green-700 px-2 py-1 rounded">
                    {user.role}
                  </span>
                </span>
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-1 hover:text-green-200"
                >
                  <span className="text-lg">🚪</span>
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link
                  href="/login"
                  className="flex items-center space-x-1 hover:text-green-200"
                >
                  <span className="text-lg">👤</span>
                  <span>Login</span>
                </Link>
                <Link
                  href="/register"
                  className="bg-green-700 px-4 py-2 rounded hover:bg-green-800"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
