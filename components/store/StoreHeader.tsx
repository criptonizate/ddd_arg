'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { useCart } from './CartProvider'
import { ShoppingBag, User, LogOut, ChevronDown, Package } from 'lucide-react'
import { signInWithGoogleCliente, signOut } from '@/lib/actions/auth'
import { createBrowserClient } from '@supabase/ssr'
import type { User as SupabaseUser } from '@supabase/supabase-js'

function GoogleIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4" />
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853" />
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" />
    </svg>
  )
}

export default function StoreHeader() {
  const { count } = useCart()
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      setReady(true)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  const displayName = user?.user_metadata?.full_name?.split(' ')[0]
    ?? user?.email?.split('@')[0]
    ?? 'Cuenta'

  return (
    <header className="sticky top-0 z-40 bg-background/90 backdrop-blur border-b border-border">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center">
          <Image src="/LogoDDDARG.png" alt="DDD ARG" width={511} height={339} className="h-9 w-auto" priority />
        </Link>

        <nav className="flex items-center gap-1">
          <Link
            href="/filamentos"
            className="px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            Filamentos
          </Link>

          {/* Sesión del cliente */}
          {ready && (
            user ? (
              <div className="relative">
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                >
                  {user.user_metadata?.avatar_url ? (
                    <img src={user.user_metadata.avatar_url} alt="" className="w-5 h-5 rounded-full" />
                  ) : (
                    <User size={15} />
                  )}
                  <span className="hidden sm:inline">{displayName}</span>
                  <ChevronDown size={12} />
                </button>
                {showDropdown && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)} />
                    <div className="absolute right-0 top-full mt-1 z-20 w-44 bg-card border border-border rounded-xl shadow-lg py-1 overflow-hidden">
                      <Link
                        href="/cuenta"
                        onClick={() => setShowDropdown(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-secondary transition-colors"
                      >
                        <Package size={14} />
                        Mis pedidos
                      </Link>
                      <div className="border-t border-border my-1" />
                      <form action={signOut}>
                        <button type="submit" className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-muted-foreground hover:bg-secondary transition-colors">
                          <LogOut size={14} />
                          Cerrar sesión
                        </button>
                      </form>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <form action={signInWithGoogleCliente}>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                >
                  <GoogleIcon />
                  <span className="hidden sm:inline">Ingresar</span>
                </button>
              </form>
            )
          )}

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
