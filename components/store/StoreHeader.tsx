'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { useCart } from './CartProvider'
import { ShoppingBag, User, LogOut, ChevronDown, Package, MapPin } from 'lucide-react'
import { signInWithGoogleCliente, signOut } from '@/lib/actions/auth'
import { createBrowserClient } from '@supabase/ssr'
import type { User as SupabaseUser } from '@supabase/supabase-js'

const WHATSAPP = '543804559909'

function GoogleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4" />
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853" />
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" />
    </svg>
  )
}

function WhatsAppIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
      <path d="M11.999 2C6.477 2 2 6.477 2 12c0 1.936.53 3.744 1.452 5.29L2.046 22l4.799-1.396A9.956 9.956 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 11.999 2zm.001 18a7.96 7.96 0 01-4.073-1.117l-.291-.174-3.028.881.86-3.105-.19-.3A7.96 7.96 0 014 12c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8-8 8z" />
    </svg>
  )
}

function InstagramIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" />
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
    <header className="sticky top-0 z-40">

      {/* ── Barra superior — carbón con info y acceso rápido ── */}
      <div className="bg-[#1c1c1c] text-white">
        <div className="max-w-6xl mx-auto px-4 h-8 flex items-center justify-between gap-2 overflow-hidden">

          {/* Izquierda: envío */}
          <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-orange-400 font-semibold truncate">
            <span className="shrink-0">🚚</span>
            <span className="truncate">Envío a todo el país · Capital, La Rioja</span>
          </div>

          {/* Derecha: redes + WhatsApp */}
          <div className="flex items-center gap-3 text-[11px] shrink-0">
            <a
              href={`https://wa.me/${WHATSAPP}`}
              target="_blank" rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1.5 text-[#25D366] hover:text-green-400 font-semibold transition-colors whitespace-nowrap"
            >
              <WhatsAppIcon />
              WhatsApp
            </a>
            <a
              href="https://instagram.com/DDD_ARG"
              target="_blank" rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1 text-gray-300 hover:text-pink-400 transition-colors whitespace-nowrap"
            >
              <InstagramIcon />
              @DDD_ARG
            </a>
          </div>
        </div>
      </div>

      {/* ── Franja naranja delgada ── */}
      <div className="h-0.5 bg-gradient-to-r from-orange-600 via-orange-500 to-yellow-400" />

      {/* ── Barra principal — blanca, logo grande ── */}
      <div className="bg-card border-b border-border shadow-sm">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">

          {/* Logo */}
          <Link href="/" className="flex items-center shrink-0">
            <Image
              src="/LogoDDDARG.png"
              alt="DDD ARG"
              width={511} height={339}
              className="h-8 sm:h-10 md:h-11 w-auto"
              priority
            />
          </Link>

          {/* Nav central */}
          <nav className="hidden md:flex items-center gap-1">
            <Link
              href="/filamentos"
              className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors shadow-sm"
            >
              🎨 Filamentos
            </Link>
          </nav>

          {/* Derecha: cuenta + carrito */}
          <div className="flex items-center gap-1">

            {/* Mobile: link filamentos */}
            <Link
              href="/filamentos"
              className="md:hidden flex items-center gap-1 bg-primary text-white text-[11px] font-bold px-2.5 py-1.5 rounded-lg whitespace-nowrap"
            >
              🎨 Filamentos
            </Link>

            {/* Sesión */}
            {ready && (
              user ? (
                <div className="relative">
                  <button
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  >
                    {user.user_metadata?.avatar_url ? (
                      <img src={user.user_metadata.avatar_url} alt="" className="w-6 h-6 rounded-full" />
                    ) : (
                      <User size={15} />
                    )}
                    <span className="hidden sm:inline text-xs font-medium">{displayName}</span>
                    <ChevronDown size={11} />
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
                          <Package size={13} />
                          Mis pedidos
                        </Link>
                        <div className="border-t border-border my-1" />
                        <form action={signOut}>
                          <button type="submit" className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-muted-foreground hover:bg-secondary transition-colors">
                            <LogOut size={13} />
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
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  >
                    <GoogleIcon />
                    <span className="hidden sm:inline">Ingresar</span>
                  </button>
                </form>
              )
            )}

            {/* Carrito */}
            <Link
              href="/carrito"
              className="relative p-2 rounded-lg hover:bg-secondary transition-colors"
              aria-label="Carrito"
            >
              <ShoppingBag size={19} />
              {count > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center w-4 h-4 rounded-full bg-primary text-white text-[9px] font-bold">
                  {count > 9 ? '9+' : count}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>
    </header>
  )
}
