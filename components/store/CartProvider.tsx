'use client'

import { createContext, useContext, useState, useEffect } from 'react'

export interface CartItem {
  product_id: string
  variant_id: string
  nombre: string
  variante: string
  imagen: string | null
  precio: number
  cantidad: number
  stock: number
}

interface CartContextType {
  items: CartItem[]
  addItem: (item: CartItem) => void
  removeItem: (variantId: string) => void
  updateQuantity: (variantId: string, cantidad: number) => void
  clearCart: () => void
  total: number
  count: number
}

const CartContext = createContext<CartContextType | null>(null)

const STORAGE_KEY = 'ddd_arg_cart'

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used inside CartProvider')
  return ctx
}

export default function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [hydrated, setHydrated] = useState(false)

  // Cargar desde localStorage en el cliente
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) setItems(JSON.parse(stored))
    } catch {}
    setHydrated(true)
  }, [])

  // Persistir cambios
  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [items, hydrated])

  function addItem(newItem: CartItem) {
    setItems((prev) => {
      const existing = prev.find((i) => i.variant_id === newItem.variant_id)
      if (existing) {
        const newQty = Math.min(existing.cantidad + newItem.cantidad, newItem.stock)
        return prev.map((i) =>
          i.variant_id === newItem.variant_id ? { ...i, cantidad: newQty } : i
        )
      }
      return [...prev, newItem]
    })
  }

  function removeItem(variantId: string) {
    setItems((prev) => prev.filter((i) => i.variant_id !== variantId))
  }

  function updateQuantity(variantId: string, cantidad: number) {
    if (cantidad <= 0) {
      removeItem(variantId)
      return
    }
    setItems((prev) =>
      prev.map((i) => {
        if (i.variant_id !== variantId) return i
        return { ...i, cantidad: Math.min(cantidad, i.stock) }
      })
    )
  }

  function clearCart() {
    setItems([])
  }

  const total = items.reduce((s, i) => s + i.precio * i.cantidad, 0)
  const count = items.reduce((s, i) => s + i.cantidad, 0)

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, updateQuantity, clearCart, total, count }}
    >
      {children}
    </CartContext.Provider>
  )
}
