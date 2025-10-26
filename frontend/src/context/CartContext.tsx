'use client'
import React, { createContext, useContext, useState, useEffect } from 'react'
import toast from 'react-hot-toast'

interface CartItem {
  _id: string
  name: string
  price: number
  unit: string
  quantity: number
  farmer: {
    name: string
    _id: string
  }
  maxQuantity: number
}

interface Product {
  _id: string
  name: string
  price: number
  unit: string
  quantity: number
  farmer: {
    name: string
    _id: string
  }
}

interface CartContextType {
  cartItems: CartItem[]
  addToCart: (product: Product, quantity: number) => void
  removeFromCart: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  getTotalPrice: () => number
  getTotalItems: () => number
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [toastQueue, setToastQueue] = useState<string[]>([])

  useEffect(() => {
    const savedCart = localStorage.getItem('cart')
    if (savedCart) {
      setCartItems(JSON.parse(savedCart))
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cartItems))
  }, [cartItems])

  useEffect(() => {
    if (toastQueue.length > 0) {
      const message = toastQueue[0]
      toast.success(message)
      setToastQueue(prev => prev.slice(1))
    }
  }, [toastQueue])

  const addToast = (message: string) => {
    setToastQueue(prev => [...prev, message])
  }

  const addToCart = (product: Product, quantity: number = 1) => {
    setCartItems(prevItems => {
      const existingItem = prevItems.find(item => item._id === product._id)
      
      if (existingItem) {
        const newQuantity = existingItem.quantity + quantity
        if (newQuantity > product.quantity) {
          toast.error(`Only ${product.quantity} ${product.unit} available`)
          return prevItems
        }
        
        setTimeout(() => addToast(`Updated ${product.name} quantity`), 0)
        
        return prevItems.map(item =>
          item._id === product._id
            ? { ...item, quantity: newQuantity }
            : item
        )
      } else {
        const newItem: CartItem = {
          _id: product._id,
          name: product.name,
          price: product.price,
          unit: product.unit,
          quantity,
          farmer: product.farmer,
          maxQuantity: product.quantity
        }
        
        setTimeout(() => addToast(`Added ${product.name} to cart`), 0)
        
        return [...prevItems, newItem]
      }
    })
  }

  const removeFromCart = (productId: string) => {
    setCartItems(prevItems => {
      const removedItem = prevItems.find(item => item._id === productId)
      if (removedItem) {
        setTimeout(() => addToast(`Removed ${removedItem.name} from cart`), 0)
      }
      return prevItems.filter(item => item._id !== productId)
    })
  }

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId)
      return
    }

    setCartItems(prevItems =>
      prevItems.map(item => {
        if (item._id === productId) {
          if (quantity > item.maxQuantity) {
            toast.error(`Only ${item.maxQuantity} ${item.unit} available`)
            return item
          }
          return { ...item, quantity }
        }
        return item
      })
    )
  }

  const clearCart = () => {
    setCartItems([])
    setTimeout(() => addToast('Cart cleared'), 0)
  }

  const getTotalPrice = () => {
    return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0)
  }

  const getTotalItems = () => {
    return cartItems.reduce((total, item) => total + item.quantity, 0)
  }

  return (
    <CartContext.Provider value={{
      cartItems,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      getTotalPrice,
      getTotalItems
    }}>
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}
