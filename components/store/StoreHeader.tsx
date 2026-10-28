'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { useCart } from './CartProvider'
import { ShoppingBag, User, LogOut, Package, Menu, X } from 'lucide-react'
import { signInWithGoogleCliente, signOutCliente } from '@/lib/actions/auth'
import { createBrowserClient } from '@supabase/ssr'
import type { User as SupabaseUser } from '@supabase/supabase-js'

const WHATSAPP = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '543804559909'

// Marcas con sus colores e iconos
const MARCAS = [
  { label: 'Fremover',      emoji: '🔴', color: '#ef4444' },
  { label: 'GST3D',         emoji: '🟢', color: '#22c55e' },
  { label: 'GST3D - LITE',  emoji: '🔵', color: '#3b82f6' },
  { label: 'Filanova',      emoji: '🟠', color: '#16a34a' },
  { label: 'Toolbox',       emoji: '🟣', color: '#a855f7' },
  { label: 'PLA+',          emoji: '✦',  color: '#16a34a' },
  { label: 'Silk',          emoji: '✨', color: '#eab308' },
  { label: 'PETG',          emoji: '💧', color: '#38bdf8' },
  { label: 'TPU Flexible',  emoji: '🌀', color: '#34d399' },
  { label: 'Matte',         emoji: '◆',  color: '#94a3b8' },
]

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
}

function WhatsAppIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
      <path d="M11.999 2C6.477 2 2 6.477 2 12c0 1.936.53 3.744 1.452 5.29L2.046 22l4.799-1.396A9.956 9.956 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 11.999 2zm.001 18a7.96 7.96 0 01-4.073-1.117l-.291-.174-3.028.881.86-3.105-.19-.3A7.96 7.96 0 014 12c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8-8 8z"/>
    </svg>
  )
}

function InstagramIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
      <circle cx="12" cy="12" r="4"/>
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none"/>
    </svg>
  )
}

export default function StoreHeader() {
  const { count, filamentCount } = useCart()
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [ready, setReady] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [popping, setPopping] = useState(false)
  const totalCount = count + filamentCount
  const isMount = useRef(true)
  const pathname = usePathname()

  useEffect(() => {
    setShowDropdown(false)
    setMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    if (isMount.current) { isMount.current = false; return }
    if (totalCount === 0) return
    setPopping(true)
    const t = setTimeout(() => setPopping(false), 300)
    return () => clearTimeout(t)
  }, [totalCount])

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      setReady(true)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  return (
    <header className="sticky top-0 z-40">

      {/* ── Barra principal ── */}
      <div
        className="border-b"
        style={{
          backgroundColor: 'oklch(0.20 0.005 264)',
          borderColor: 'oklch(1 0 0 / 10%)',
        }}
      >
        <div className="max-w-6xl mx-auto px-4 h-14 sm:h-16 flex items-center justify-between gap-4">

          {/* Hamburguesa mobile */}
          <button
            onClick={() => setMenuOpen(v => !v)}
            aria-label="Menú"
            className="md:hidden p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg transition-colors hover:opacity-80"
            style={{ color: 'oklch(0.65 0.005 264)' }}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          {/* Logo */}
          <Link href="/" className="flex items-center shrink-0">
            <Image
              src="/LogoDDDARG.png"
              alt="DDD ARG"
              width={511} height={339}
              className="h-6 sm:h-11 w-auto brightness-0 invert"
              priority
            />
          </Link>

          {/* Nav central — desktop */}
          <nav className="hidden md:flex items-center gap-1">
            <Link
              href="/filamentos"
              className="px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors hover:text-[#16a34a]"
              style={{ color: 'oklch(0.55 0.005 264)' }}
            >
              🧵 Filamentos
            </Link>
            <Link
              href="/insumos"
              className="px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors hover:text-[#16a34a]"
              style={{ color: 'oklch(0.55 0.005 264)' }}
            >
              📦 Insumos
            </Link>
          </nav>

          {/* Acciones derecha */}
          <div className="flex items-center gap-1 sm:gap-2">

            {/* WhatsApp */}
            <a
              href={`https://wa.me/${WHATSAPP}`}
              target="_blank" rel="noopener noreferrer"
              aria-label="WhatsApp"
              className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg transition-colors text-[#25D366] hover:opacity-80"
            >
              <WhatsAppIcon size={18} />
            </a>

            {/* Instagram */}
            <a
              href="https://instagram.com/DDD_ARG"
              target="_blank" rel="noopener noreferrer"
              aria-label="Instagram"
              className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg transition-colors text-[#E1306C] hover:opacity-80"
            >
              <InstagramIcon size={18} />
            </a>

            <span className="w-px h-5 mx-0.5" style={{ backgroundColor: 'oklch(1 0 0 / 12%)' }} />

            {/* Sesión */}
            {ready && (
              user ? (
                <div className="relative">
                  <button
                    onClick={() => setShowDropdown(!showDropdown)}
                    aria-label="Mi cuenta"
                    className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg transition-colors hover:opacity-80 gap-1.5"
                  >
                    {user.user_metadata?.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={user.user_metadata.avatar_url} alt="" className="w-7 h-7 rounded-full ring-2 ring-[#16a34a]/40" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-[#16a34a]/20 flex items-center justify-center">
                        <User size={14} className="text-[#16a34a]" />
                      </div>
                    )}
                  </button>
                  {showDropdown && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)} />
                      <div
                        className="absolute right-0 top-full mt-2 z-20 w-52 rounded-xl shadow-2xl border overflow-hidden"
                        style={{
                          backgroundColor: 'oklch(0.155 0.005 264)',
                          borderColor: 'oklch(1 0 0 / 10%)',
                        }}
                      >
                        <Link
                          href="/cuenta?tab=perfil"
                          onClick={() => setShowDropdown(false)}
                          className="block px-4 py-3 border-b hover:bg-white/5 transition-colors"
                          style={{ borderColor: 'oklch(1 0 0 / 8%)' }}
                        >
                          <p className="text-xs font-bold truncate" style={{ color: 'oklch(0.95 0.003 264)' }}>
                            {user.user_metadata?.full_name?.split(' ')[0] ?? user.email?.split('@')[0]}
                          </p>
                          <p className="text-[10px] truncate" style={{ color: 'oklch(0.56 0.007 264)' }}>{user.email}</p>
                          <p className="text-[10px] font-semibold mt-0.5" style={{ color: '#4ade80' }}>Mi cuenta →</p>
                        </Link>
                        <Link
                          href="/cuenta"
                          onClick={() => setShowDropdown(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors hover:bg-white/5"
                          style={{ color: 'oklch(0.80 0.005 264)' }}
                        >
                          <Package size={13} />
                          Mis pedidos
                        </Link>
                        <div className="my-1 border-t" style={{ borderColor: 'oklch(1 0 0 / 8%)' }} />
                        <form action={signOutCliente}>
                          <button
                            type="submit"
                            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors hover:bg-white/5"
                            style={{ color: 'oklch(0.56 0.007 264)' }}
                          >
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
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all hover:border-[#16a34a]/50 hover:text-[#16a34a]"
                    style={{
                      borderColor: 'oklch(1 0 0 / 12%)',
                      color: 'oklch(0.75 0.005 264)',
                    }}
                  >
                    <GoogleIcon />
                    Mi Cuenta
                  </button>
                </form>
              )
            )}

            {/* Carrito */}
            <Link
              href="/carrito"
              className="relative p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg transition-colors hover:opacity-80"
              aria-label="Carrito"
              style={{ color: 'oklch(0.55 0.005 264)' }}
            >
              <ShoppingBag size={19} />
              {totalCount > 0 && (
                <span
                  className="absolute -top-0.5 -right-0.5 flex items-center justify-center w-4 h-4 rounded-full bg-[#16a34a] text-white text-[9px] font-black"
                  style={{
                    transform: popping ? 'scale(1.45)' : 'scale(1)',
                    transition: 'transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  }}
                >
                  {totalCount > 9 ? '9+' : totalCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>

      {/* ── Barra de marcas — marquee animado ── */}
      <div
        className="overflow-hidden border-b"
        style={{
          backgroundColor: 'oklch(0.17 0.005 264)',
          borderColor: 'oklch(1 0 0 / 8%)',
        }}
      >
        <div
          className="flex gap-0 py-2"
          style={{
            animation: 'marquee-store 28s linear infinite',
            width: 'max-content',
          }}
        >
          {[...MARCAS, ...MARCAS].map((m, i) => (
            <Link
              key={i}
              href="/filamentos"
              className="flex items-center gap-2 px-5 shrink-0 select-none hover:opacity-70 transition-opacity"
              style={{ borderRight: '1px solid oklch(1 0 0 / 6%)' }}
            >
              <span className="text-sm" style={{ filter: 'drop-shadow(0 0 4px currentColor)' }}>{m.emoji}</span>
              <span className="text-xs font-bold tracking-wide whitespace-nowrap" style={{ color: m.color }}>
                {m.label}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Menú mobile ── */}
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-30 md:hidden" onClick={() => setMenuOpen(false)} />
          <div
            className="absolute left-0 right-0 z-40 md:hidden border-b shadow-2xl"
            style={{
              backgroundColor: 'oklch(0.17 0.005 264)',
              borderColor: 'oklch(1 0 0 / 10%)',
            }}
          >
            <nav className="flex flex-col py-2 px-4">
              <Link
                href="/filamentos"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-colors hover:bg-white/5"
                style={{ color: 'oklch(0.80 0.005 264)' }}
              >
                🧵 Filamentos
              </Link>
              <Link
                href="/insumos"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-colors hover:bg-white/5"
                style={{ color: 'oklch(0.80 0.005 264)' }}
              >
                📦 Insumos
              </Link>
              <Link
                href="/cuenta"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-colors hover:bg-white/5"
                style={{ color: 'oklch(0.80 0.005 264)' }}
              >
                👤 Mi Cuenta
              </Link>
              <div className="my-1 border-t" style={{ borderColor: 'oklch(1 0 0 / 8%)' }} />
              <div className="flex items-center gap-3 px-3 py-2">
                <a
                  href={`https://wa.me/${WHATSAPP}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm transition-colors hover:opacity-80"
                  style={{ color: '#25D366' }}
                  onClick={() => setMenuOpen(false)}
                >
                  <WhatsAppIcon size={16} />
                  WhatsApp
                </a>
                <a
                  href="https://instagram.com/DDD_ARG"
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm transition-colors hover:opacity-80"
                  style={{ color: '#E1306C' }}
                  onClick={() => setMenuOpen(false)}
                >
                  <InstagramIcon size={16} />
                  Instagram
                </a>
              </div>
            </nav>
          </div>
        </>
      )}

      <style>{`
        @keyframes marquee-store {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </header>
  )
}
