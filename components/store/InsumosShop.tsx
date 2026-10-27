'use client'

import { useState, useMemo, useTransition, useEffect } from 'react'
import { ShoppingCart, Plus, Minus, X, Trash2, CheckCircle2, Loader2, Search } from 'lucide-react'
import type { Insumo, InsumoPedidoItem } from '@/lib/actions/insumos'
import { crearPedidoInsumo } from '@/lib/actions/insumos'
import type { MembresiaStatus } from '@/lib/actions/filamento-pedidos'
import { signInWithGoogleAndReturn } from '@/lib/actions/auth'
import { createBrowserClient } from '@supabase/ssr'
import type { User } from '@supabase/supabase-js'

const WHATSAPP_NUMBER = '543804559909'

const DESCUENTOS_INSUMOS = [
  { min: 15, pct: 15, label: 'Elite 15%' },
  { min: 10, pct: 10, label: 'Plus 10%' },
  { min:  5, pct:  5, label: 'Mayorista 5%' },
  { min:  0, pct:  0, label: '' },
] as const

function getDescuentoInsumo(kgPeriodo: number) {
  return DESCUENTOS_INSUMOS.find(t => kgPeriodo >= t.min) ?? { pct: 0, label: '' }
}

function fmtARS(n: number) { return `$${n.toLocaleString('es-AR')}` }

function AuthModal({ onClose, onLogin }: { onClose: () => void; onLogin: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-background rounded-2xl shadow-2xl overflow-hidden">
        <div className="px-6 py-7 space-y-5">
          <div className="text-center">
            <p className="text-lg font-bold mb-1">Iniciar sesión</p>
            <p className="text-sm text-muted-foreground">Necesitás estar logueado para hacer un pedido</p>
          </div>
          <button
            onClick={onLogin}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-800 border border-gray-300 rounded-xl py-3 text-sm font-semibold shadow-sm transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            Continuar con Google
          </button>
          <button onClick={onClose} className="w-full text-xs text-muted-foreground hover:text-foreground underline">Cancelar</button>
        </div>
      </div>
    </div>
  )
}

interface CartItem { insumo: Insumo; cantidad: number }

export default function InsumosShop({
  insumos,
  initialUser,
  membresia,
}: {
  insumos: Insumo[]
  initialUser: User | null
  membresia: MembresiaStatus | null
}) {
  const [cart, setCart] = useState<CartItem[]>([])
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('')
  const [showCart, setShowCart] = useState(false)
  const [showCheckout, setShowCheckout] = useState(false)
  const [checkoutStep, setCheckoutStep] = useState<'form' | 'saving' | 'done'>('form')
  const [checkoutError, setCheckoutError] = useState('')
  const [clienteNombre, setClienteNombre] = useState('')
  const [clienteTelefono, setClienteTelefono] = useState('')
  const [pedidoNumero, setPedidoNumero] = useState<number | null>(null)
  const [pedidoSnapshot, setPedidoSnapshot] = useState<{ items: CartItem[]; subtotal: number; descuento: number; pct: number } | null>(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [user, setUser] = useState<User | null>(initialUser)
  const [membresiaState, setMembresiaState] = useState<MembresiaStatus | null>(membresia)
  const [, startTransition] = useTransition()

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) {
        setClienteNombre(u.user_metadata?.full_name ?? '')
        import('@/lib/actions/filamento-pedidos').then(({ getMembresiaCliente }) => {
          getMembresiaCliente(u.id).then(setMembresiaState)
        })
      } else {
        setMembresiaState(null)
      }
    })
    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (user) setClienteNombre(prev => prev || (user.user_metadata?.full_name ?? ''))
  }, [user])

  const kgPeriodo = membresiaState?.kgPeriodo ?? 0
  const { pct, label: descLabel } = getDescuentoInsumo(kgPeriodo)

  const categorias = useMemo(() => Array.from(new Set(insumos.map(i => i.categoria))).sort(), [insumos])

  const filtered = useMemo(() => {
    let list = insumos
    if (catFilter) list = list.filter(i => i.categoria === catFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(i =>
        i.nombre.toLowerCase().includes(q) ||
        i.descripcion?.toLowerCase().includes(q) ||
        i.categoria.toLowerCase().includes(q)
      )
    }
    return list
  }, [insumos, catFilter, search])

  const subtotalSin = cart.reduce((s, i) => s + i.cantidad * i.insumo.precio_unitario, 0)
  const descuentoARS = Math.round(subtotalSin * pct / 100)
  const total = subtotalSin - descuentoARS
  const totalUnidades = cart.reduce((s, i) => s + i.cantidad, 0)

  function loginConCarrito() {
    signInWithGoogleAndReturn('/insumos')
  }

  function addToCart(insumo: Insumo) {
    if (!user) { setShowAuthModal(true); return }
    setCart(prev => {
      const existing = prev.find(i => i.insumo.id === insumo.id)
      if (existing) {
        if (existing.cantidad >= insumo.stock) return prev
        return prev.map(i => i.insumo.id === insumo.id ? { ...i, cantidad: i.cantidad + 1 } : i)
      }
      return [...prev, { insumo, cantidad: 1 }]
    })
  }

  function setCantidad(id: string, cantidad: number) {
    const insumo = insumos.find(i => i.id === id) ?? cart.find(i => i.insumo.id === id)?.insumo
    const max = insumo?.stock ?? 999
    if (cantidad <= 0) setCart(prev => prev.filter(i => i.insumo.id !== id))
    else setCart(prev => prev.map(i => i.insumo.id === id ? { ...i, cantidad: Math.min(cantidad, max) } : i))
  }

  function removeFromCart(id: string) { setCart(prev => prev.filter(i => i.insumo.id !== id)) }
  function getCartCantidad(id: string) { return cart.find(i => i.insumo.id === id)?.cantidad ?? 0 }

  function abrirCheckout() {
    if (!cart.length) return
    if (!user) { setShowCart(false); setShowAuthModal(true); return }
    setShowCheckout(true); setCheckoutStep('form'); setCheckoutError(''); setPedidoNumero(null)
  }

  function handleConfirmarPedido() {
    if (!clienteNombre.trim()) { setCheckoutError('Tu nombre es requerido'); return }
    setCheckoutError(''); setCheckoutStep('saving')
    startTransition(async () => {
      const result = await crearPedidoInsumo({
        cliente_nombre: clienteNombre,
        cliente_telefono: clienteTelefono,
        items: cart.map(i => ({
          insumo_id: i.insumo.id,
          nombre: i.insumo.nombre,
          cantidad: i.cantidad,
          precio_unitario: i.insumo.precio_unitario,
        })),
        total,
        descuento_pct: pct,
      })
      if (result.error) { setCheckoutError(result.error); setCheckoutStep('form'); return }
      if (user && clienteTelefono.trim()) {
        const sb = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
        sb.auth.updateUser({ data: { phone: clienteTelefono.trim() } })
      }
      setPedidoSnapshot({ items: cart, subtotal: subtotalSin, descuento: descuentoARS, pct })
      setPedidoNumero(result.numero!); setCheckoutStep('done'); setCart([]); setShowCart(false)
    })
  }

  function abrirWhatsApp(numero: number) {
    const snap = pedidoSnapshot
    if (!snap) return
    const itemLines = snap.items.map(i =>
      `  - ${i.cantidad}x ${i.insumo.nombre}`
    )
    const lines = [
      `Hola, soy ${clienteNombre}!`,
      `Hice el pedido de insumos N° ${numero} desde la web.`,
      ``,
      `*Detalle:*`,
      ...itemLines,
      ``,
      snap.pct > 0
        ? `Descuento mayorista (${snap.pct}%): -${fmtARS(snap.descuento)}`
        : null,
      `*Total: ${fmtARS(total)}*`,
      ``,
      `Quedo esperando confirmacion para coordinar el pago y la entrega.`,
    ].filter(Boolean).join('\n')
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(lines)}`, '_blank')
  }

  return (
    <div className="relative">

      {/* ── Filtros + grid ── */}
      <div className="flex gap-6 items-start">

        {/* Sidebar desktop */}
        {categorias.length > 1 && (
          <aside className="hidden lg:block w-48 shrink-0 sticky top-[72px] bg-card border border-border rounded-2xl p-4 space-y-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">Categoría</p>
              <div className="space-y-1">
                <button
                  onClick={() => setCatFilter('')}
                  className={`w-full text-left text-sm px-3 py-1.5 rounded-lg transition-colors ${!catFilter ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 font-semibold' : 'hover:bg-secondary'}`}
                >
                  Todos ({insumos.length})
                </button>
                {categorias.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setCatFilter(catFilter === cat ? '' : cat)}
                    className={`w-full text-left text-sm px-3 py-1.5 rounded-lg transition-colors flex items-center justify-between ${catFilter === cat ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 font-semibold' : 'hover:bg-secondary'}`}
                  >
                    {cat}
                    <span className="text-xs text-muted-foreground">{insumos.filter(i => i.categoria === cat).length}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Descuentos mayoristas */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: '#22c55e' }}>💰 Descuento mayorista</p>
              {kgPeriodo > 0 && (
                <div className="mb-2 text-[10px] px-2.5 py-1.5 rounded-lg border font-semibold"
                  style={{ backgroundColor: 'oklch(0.22 0.04 145)', borderColor: '#166534', color: '#4ade80' }}>
                  🏆 {kgPeriodo.toFixed(1)} kg filamentos comprados
                </div>
              )}
              <div className="space-y-1.5">
                {[
                  { min: 5,  pct: 5,  label: 'Plata' },
                  { min: 10, pct: 10, label: 'Oro' },
                  { min: 15, pct: 15, label: 'Platino' },
                ].map(t => {
                  const activo = kgPeriodo >= t.min
                  return (
                    <div
                      key={t.min}
                      className="flex items-center justify-between text-xs rounded-lg px-3 py-2 font-semibold border"
                      style={activo
                        ? { backgroundColor: '#166534', color: '#bbf7d0', borderColor: '#16a34a' }
                        : { backgroundColor: 'oklch(0.22 0.005 264)', color: 'oklch(0.50 0.006 264)', borderColor: 'oklch(1 0 0 / 8%)' }
                      }
                    >
                      <span>{activo ? '✓ ' : ''}{t.label} {t.min}+ kg</span>
                      <span>−{t.pct}%</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </aside>
        )}

        {/* Main */}
        <div className="flex-1 min-w-0">

          {/* Searchbar + banner */}
          <div className="mb-4 space-y-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Buscar insumo..."
                className="w-full text-sm border border-border rounded-xl pl-8 pr-3 py-2.5 bg-background focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
            </div>

            {/* Categorías mobile */}
            {categorias.length > 1 && (
              <div className="flex gap-2 flex-wrap lg:hidden">
                <button
                  onClick={() => setCatFilter('')}
                  className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${!catFilter ? 'bg-orange-500 text-white border-orange-500' : 'border-border text-muted-foreground hover:text-foreground'}`}
                >
                  Todos
                </button>
                {categorias.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setCatFilter(catFilter === cat ? '' : cat)}
                    className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${catFilter === cat ? 'bg-orange-500 text-white border-orange-500' : 'border-border text-muted-foreground hover:text-foreground'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}

            {/* Membership banner */}
            {pct > 0 && (
              <div className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl border"
                style={{ backgroundColor: 'oklch(0.22 0.04 145)', borderColor: '#166534', color: '#4ade80' }}>
                <span>🏆</span>
                <span>Mayorista activo · <strong>−{pct}% de descuento</strong> en insumos ({descLabel})</span>
              </div>
            )}
          </div>

          {/* Count */}
          <p className="text-xs sm:text-sm text-muted-foreground mb-3">
            {filtered.length} producto{filtered.length !== 1 ? 's' : ''}
          </p>

          {/* Grid */}
          {filtered.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <p className="text-4xl mb-3">🔍</p>
              <p className="font-medium">Sin resultados</p>
              <button onClick={() => { setSearch(''); setCatFilter('') }} className="mt-3 text-sm text-orange-600 underline">
                Limpiar filtros
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {filtered.map(insumo => {
                const enCart = getCartCantidad(insumo.id)
                const precioFinal = pct > 0 ? Math.round(insumo.precio_unitario * (1 - pct / 100)) : insumo.precio_unitario
                return (
                  <div
                    key={insumo.id}
                    className="rounded-2xl overflow-hidden border bg-card flex flex-col"
                    style={{ borderColor: 'oklch(1 0 0 / 10%)' }}
                  >
                    {/* Imagen o placeholder */}
                    {insumo.imagen_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={insumo.imagen_url} alt={insumo.nombre} className="w-full h-32 object-cover" />
                    ) : (
                      <div className="h-32 flex items-center justify-center text-4xl"
                        style={{ backgroundColor: 'oklch(0.22 0.005 264)' }}>
                        📦
                      </div>
                    )}
                    <div className="p-3 flex flex-col flex-1">
                      <p className="font-bold text-sm leading-tight line-clamp-2 mb-0.5">{insumo.nombre}</p>
                      <p className="text-[10px] text-muted-foreground mb-1">{insumo.categoria}</p>
                      {insumo.descripcion && (
                        <p className="text-[10px] text-muted-foreground line-clamp-2 mb-2">{insumo.descripcion}</p>
                      )}
                      <div className="mt-auto">
                        {pct > 0 ? (
                          <div className="mb-2">
                            <span className="line-through text-muted-foreground text-xs">{fmtARS(insumo.precio_unitario)}</span>
                            <span className="ml-1.5 font-black text-sm" style={{ color: '#22c55e' }}>{fmtARS(precioFinal)}</span>
                          </div>
                        ) : (
                          <p className="font-black text-sm mb-2">{fmtARS(insumo.precio_unitario)}</p>
                        )}
                        {insumo.stock <= 3 && insumo.stock > 0 && (
                          <p className="text-[10px] text-amber-500 font-semibold mb-1">Últimas {insumo.stock} unidades</p>
                        )}
                        {enCart === 0 ? (
                          <button
                            onClick={() => addToCart(insumo)}
                            className="w-full py-2 rounded-xl text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white transition-colors flex items-center justify-center gap-1"
                          >
                            <Plus size={12} /> Agregar
                          </button>
                        ) : (
                          <div className="flex items-center justify-between gap-1">
                            <button onClick={() => setCantidad(insumo.id, enCart - 1)} className="p-1.5 rounded-lg border border-border hover:bg-secondary">
                              <Minus size={11} />
                            </button>
                            <span className="text-sm font-black">{enCart}</span>
                            <button
                              onClick={() => setCantidad(insumo.id, enCart + 1)}
                              disabled={enCart >= insumo.stock}
                              className="p-1.5 rounded-lg border border-border hover:bg-secondary disabled:opacity-30"
                            >
                              <Plus size={11} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Botón flotante del carrito ── */}
      {totalUnidades > 0 && (
        <button
          onClick={() => setShowCart(true)}
          className="fixed bottom-[env(safe-area-inset-bottom,0px)] mb-5 right-3 sm:right-4 z-40 flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 shadow-xl transition-colors"
          style={{ marginBottom: 'max(20px, env(safe-area-inset-bottom, 20px))' }}
        >
          <ShoppingCart size={16} className="shrink-0" />
          <span className="text-xs sm:text-sm font-bold">{totalUnidades} items</span>
          <span className="text-xs sm:text-sm font-bold">{fmtARS(total)}</span>
          {pct > 0 && (
            <span className="hidden xs:inline text-[10px] bg-white/20 font-bold px-1.5 py-0.5 rounded-full">
              -{pct}%
            </span>
          )}
        </button>
      )}

      {/* ── Panel del carrito ── */}
      {showCart && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 min-w-0 bg-black/40" onClick={() => setShowCart(false)} />
          <div className="w-full sm:max-w-sm bg-background border-l border-border flex flex-col shadow-2xl" style={{ maxHeight: '100dvh' }}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="font-bold text-base">Tu carrito</h2>
              <button onClick={() => setShowCart(false)} className="p-1.5 rounded-lg hover:bg-secondary"><X size={16} /></button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {cart.map(item => (
                <div key={item.insumo.id} className="flex items-center gap-3">
                  <span className="text-2xl shrink-0">📦</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{item.insumo.nombre}</p>
                    <p className="text-xs text-muted-foreground">{fmtARS(item.insumo.precio_unitario)} c/u</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => setCantidad(item.insumo.id, item.cantidad - 1)} className="p-1 rounded-md border border-border hover:bg-secondary"><Minus size={11} /></button>
                    <span className="text-sm font-bold w-6 text-center">{item.cantidad}</span>
                    <button onClick={() => setCantidad(item.insumo.id, item.cantidad + 1)} disabled={item.cantidad >= item.insumo.stock} className="p-1 rounded-md border border-border hover:bg-secondary disabled:opacity-30"><Plus size={11} /></button>
                    <button onClick={() => removeFromCart(item.insumo.id)} className="p-1 rounded-md hover:bg-red-50 hover:text-red-600 text-muted-foreground ml-0.5"><Trash2 size={11} /></button>
                  </div>
                </div>
              ))}
            </div>

            <div className="px-5 py-4 border-t border-border space-y-3">
              {pct > 0 && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Subtotal</span><span>{fmtARS(subtotalSin)}</span>
                  </div>
                  <div className="flex justify-between text-xs" style={{ color: '#22c55e' }}>
                    <span>Descuento mayorista (−{pct}%)</span><span>−{fmtARS(descuentoARS)}</span>
                  </div>
                </div>
              )}
              <div className="flex justify-between font-bold text-base border-t border-border pt-2">
                <span>Total estimado</span><span>{fmtARS(total)}</span>
              </div>
              <button
                onClick={() => { setShowCart(false); abrirCheckout() }}
                className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl py-3 text-sm font-bold shadow-sm transition-colors"
              >
                {!user ? '🔒 Ingresá para confirmar' : 'Confirmar pedido →'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal de checkout ── */}
      {showCheckout && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/50">
          <div className="w-full sm:max-w-md bg-background border border-border sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-y-auto" style={{ maxHeight: '92dvh' }}>
            {checkoutStep !== 'done' ? (
              <>
                <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                  <h2 className="font-bold text-base">Confirmar pedido</h2>
                  {checkoutStep === 'form' && (
                    <button onClick={() => setShowCheckout(false)} className="p-1.5 rounded-lg hover:bg-secondary"><X size={16} /></button>
                  )}
                </div>

                {/* Resumen */}
                <div className="px-6 pt-5 space-y-4">
                  <div className="bg-secondary/40 rounded-xl px-4 py-3 space-y-1">
                    {cart.map(i => (
                      <div key={i.insumo.id} className="flex items-center gap-2 text-sm">
                        <span className="text-base shrink-0">📦</span>
                        <span className="flex-1 truncate text-xs">{i.cantidad}x {i.insumo.nombre}</span>
                        <span className="text-xs font-mono text-muted-foreground">{fmtARS(i.cantidad * i.insumo.precio_unitario)}</span>
                      </div>
                    ))}
                    <div className="border-t border-border mt-2 pt-2 space-y-1">
                      {pct > 0 && (
                        <>
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Subtotal</span><span>{fmtARS(subtotalSin)}</span>
                          </div>
                          <div className="flex justify-between text-xs font-semibold" style={{ color: '#22c55e' }}>
                            <span>Desc. mayorista −{pct}%</span><span>−{fmtARS(descuentoARS)}</span>
                          </div>
                        </>
                      )}
                      <div className="flex justify-between text-sm font-bold pt-1">
                        <span>Total</span><span>{fmtARS(total)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Formulario */}
                {!user ? (
                  <div className="px-6 py-6 space-y-4">
                    <div className="text-center space-y-2">
                      <p className="text-sm font-semibold">Iniciá sesión para continuar</p>
                    </div>
                    <button onClick={loginConCarrito}
                      className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-800 border border-gray-300 rounded-xl py-3 text-sm font-semibold shadow-sm transition-colors">
                      Continuar con Google
                    </button>
                  </div>
                ) : (
                  <div className="px-6 py-5 space-y-4">
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground block mb-1">Tu nombre *</label>
                        <input type="text" value={clienteNombre} onChange={e => setClienteNombre(e.target.value)}
                          placeholder="¿Cómo te llamás?" disabled={checkoutStep === 'saving'}
                          className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-orange-300 disabled:opacity-50" />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground block mb-1">Teléfono (opcional)</label>
                        <input type="tel" value={clienteTelefono} onChange={e => setClienteTelefono(e.target.value)}
                          placeholder="Para coordinar la entrega" disabled={checkoutStep === 'saving'}
                          className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-orange-300 disabled:opacity-50" />
                      </div>
                    </div>
                    {checkoutError && <p className="text-xs text-red-600 dark:text-red-400">{checkoutError}</p>}
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Una vez confirmado el pedido, revisamos el stock y te avisamos por WhatsApp para coordinar el pago y la entrega.
                    </p>
                  </div>
                )}

                {user && (
                  <div className="px-6 pb-5">
                    <button onClick={handleConfirmarPedido} disabled={checkoutStep === 'saving' || !clienteNombre.trim()}
                      className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-40 rounded-xl py-3 text-sm font-bold transition-colors">
                      {checkoutStep === 'saving' ? <><Loader2 size={15} className="animate-spin" /> Guardando...</> : 'Hacer el pedido'}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="px-6 py-8 text-center space-y-4">
                <div className="flex justify-center"><CheckCircle2 size={52} className="text-green-500" /></div>
                <div>
                  <p className="text-xl font-bold mb-1">¡Pedido N° {pedidoNumero} registrado!</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Avisame por WhatsApp para que revise el stock y confirme. 🙌
                  </p>
                </div>
                <button onClick={() => { abrirWhatsApp(pedidoNumero!); setShowCheckout(false) }}
                  className="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1ebe5a] text-white rounded-xl py-3 text-sm font-bold shadow-sm transition-colors">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                    <path d="M11.999 2C6.477 2 2 6.477 2 12c0 1.936.53 3.744 1.452 5.29L2.046 22l4.799-1.396A9.956 9.956 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 11.999 2zm.001 18a7.96 7.96 0 01-4.073-1.117l-.291-.174-3.028.881.86-3.105-.19-.3A7.96 7.96 0 014 12c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8-8 8z" />
                  </svg>
                  Avisar por WhatsApp
                </button>
                <button onClick={() => setShowCheckout(false)} className="w-full text-xs text-muted-foreground hover:text-foreground underline py-1">Cerrar</button>
              </div>
            )}
          </div>
        </div>
      )}

      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} onLogin={loginConCarrito} />}
    </div>
  )
}
