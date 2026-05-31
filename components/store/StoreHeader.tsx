'use client'

import Link from 'next/link'
import { useCart } from './CartProvider'
import { ShoppingBag } from 'lucide-react'

export default function StoreHeader() {
  const { count } = useCart()

  return (
    <header className="sticky top-0 z-40 bg-background/90 backdrop-blur border-b border-border">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-foreground">
            <span className="text-xs font-bold text-background">3D</span>
          </div>
          <span className="font-semibold text-sm">DDD ARG</span>
        </Link>

        <nav className="flex items-center gap-1">
          <Link
            href="/catalogo"
            className="px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            Catálogo
          </Link>
          <Link
            href="/auth/login"
            className="px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            Admin
          </Link>
          <Link
            href="/carrito"
            className="relative p-2 rounded-lg hover:bg-secondary transition-colors"
            aria-label="Carrito"
          >
            <ShoppingBag size={18} />
            {count > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center w-4 h-4 rounded-full bg-[var(--brand-orange)] text-white text-[10px] font-bold">
                {count > 9 ? '9+' : count}
              </span>
            )}
          </Link>
        </nav>
      </div>
    </header>
  )
}
