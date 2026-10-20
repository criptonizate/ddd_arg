'use client'

import { useState, useMemo, useTransition, useEffect, useRef } from 'react'
import { ShoppingCart, Plus, Minus, X, Trash2, CheckCircle2, Loader2, SlidersHorizontal, Search } from 'lucide-react'
import type { Filamento } from '@/lib/filamentos-helpers'
import { crearPedidoFilamento } from '@/lib/actions/filamento-pedidos'
import { createBrowserClient } from '@supabase/ssr'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import { signInWithGoogleCliente } from '@/lib/actions/auth'

const WHATSAPP_NUMBER = '543804559909'
const PRECIO_BASE = 22000

const DESCUENTOS = [
  { min: 15, descuento: 4000, label: '15+ kg' },
  { min: 10, descuento: 3000, label: '10+ kg' },
  { min:  5, descuento: 2000, label:  '5+ kg' },
  { min:  0, descuento:    0, label:      '' },
] as const

function getDescuento(total: number) {
  return DESCUENTOS.find(t => total >= t.min) ?? { descuento: 0, label: '' }
}

function colorToCss(color: string): string {
  const c = color.toLowerCase()
  if (c.includes('black'))                            return '#1a1a1a'
  if (c.includes('white'))                            return '#f0f0f0'
  if (c.includes('grey') || c.includes('gray'))       return '#9ca3af'
  if (c.includes('vermilion') || c.includes('ruby'))  return '#c0392b'
  if (c.includes('berry') || c.includes('red'))       return '#e53e3e'
  if (c.includes('blue'))                             return '#3b82f6'
  if (c.includes('teal'))                             return '#14b8a6'
  if (c.includes('olive'))                            return '#84a830'
  if (c.includes('green'))                            return '#22c55e'
  if (c.includes('yellow') || c.includes('sunshine')) return '#eab308'
  if (c.includes('orange'))                           return '#f97316'
  if (c.includes('taro') || c.includes('purple'))     return '#a855f7'
  if (c.includes('pink'))                             return '#ec4899'
  if (c.includes('brown') || c.includes('madera'))    return '#92400e'
  if (c.includes('silk') || c.includes('gold'))       return '#d97706'
  return '#94a3b8'
}

function shortNombre(nombre: string): string {
  return nombre.replace(/\s+high\s+speed\b/gi, '').replace(/\s+hs\b/gi, '').trim()
}

function fmtARS(n: number) {
  return `$${n.toLocaleString('es-AR')}`
}

function maxKg(f: Filamento): number {
  return Math.floor((f.rollos_cerrados * f.peso_rollo_gr + f.gramos_sueltos) / 1000)
}

type CartItem = { filamento: Filamento; rollos: number }
type CheckoutStep = 'form' | 'saving' | 'done'

const MAT_COLORS: Record<string, string> = {
  PLA:  '#22c55e', PETG: '#3b82f6', TPU: '#a855f7', ABS: '#f97316', ASA: '#eab308',
}

// ── Helpers visuales ──────────────────────────────────────────────────────────

function colorIsLight(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 > 160
}

// ── Componente tarjeta de filamento ───────────────────────────────────────────

function FilamentoCard({
  f, enCart, onAdd, onSetRollos, precioUnitario, descuento,
}: {
  f: Filamento
  enCart: number
  onAdd: () => void
  onSetRollos: (n: number) => void
  precioUnitario: number
  descuento: number
}) {
  const disponible = maxKg(f)
  const enMax = enCart >= disponible
  const css = colorToCss(f.color)
  const isLight = colorIsLight(css)
  const isWhite = f.color.toLowerCase().includes('white')
  const fotos = [f.imagen_url, f.imagen_url_2, f.imagen_url_3].filter(Boolean) as string[]
  const [fotoIdx, setFotoIdx] = useState(0)
  const fotoActual = fotos[fotoIdx] ?? null

  return (
    <div
      className={`rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow border ${enCart > 0 ? 'ring-1' : ''}`}
      style={{
        backgroundColor: 'oklch(0.26 0.005 264)',
        borderColor: enCart > 0 ? '#15803d' : 'oklch(1 0 0 / 10%)',
        ...(enCart > 0 ? { boxShadow: '0 0 0 1px #15803d44' } : {}),
      }}
    >

      {/* ── Área de imagen / carousel ── */}
      <div
        className="relative h-40 flex items-center justify-center overflow-hidden select-none"
        style={fotoActual ? {} : {
          backgroundColor: css,
          backgroundImage: `radial-gradient(circle at 30% 30%, ${isLight ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.12)'} 0%, transparent 60%)`,
          ...(isWhite ? { border: '1px solid #e5e7eb' } : {}),
        }}
      >
        {fotoActual ? (
          <img
            key={fotoIdx}
            src={fotoActual}
            alt={`${f.color} ${f.material} - foto ${fotoIdx + 1}`}
            className="absolute inset-0 w-full h-full object-cover transition-opacity duration-200"
          />
        ) : (
          <span
            className="w-16 h-16 rounded-full shadow-lg border-4"
            style={{
              backgroundColor: css,
              borderColor: isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.3)',
              filter: 'brightness(0.92) saturate(1.1)',
            }}
          />
        )}

        {/* Flechas del carousel */}
        {fotos.length > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setFotoIdx((fotoIdx - 1 + fotos.length) % fotos.length) }}
              className="absolute left-1.5 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur-sm transition-colors"
              aria-label="Foto anterior"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M8 2L4 6l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setFotoIdx((fotoIdx + 1) % fotos.length) }}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur-sm transition-colors"
              aria-label="Foto siguiente"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>

            {/* Dots */}
            <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5 z-10">
              {fotos.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setFotoIdx(i) }}
                  className={`rounded-full transition-all duration-200 ${i === fotoIdx ? 'w-4 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/50 hover:bg-white/80'}`}
                  aria-label={`Foto ${i + 1}`}
                />
              ))}
            </div>
          </>
        )}

        {/* Stock badge */}
        <span className={`absolute top-2.5 right-2.5 text-[10px] font-bold px-2 py-0.5 rounded-full z-10 ${
          disponible >= 10 ? 'bg-green-500 text-white'
          : disponible >= 3 ? 'bg-yellow-400 text-yellow-950'
          : 'bg-red-500 text-white'
        }`}>
          {disponible} kg
        </span>

        {/* Indicador en carrito */}
        {enCart > 0 && (
          <span className="absolute bottom-2 right-2 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full z-10" style={{ backgroundColor: '#15803d' }}>
            {enCart} kg
          </span>
        )}
      </div>

      {/* ── Información ── */}
      <div className="p-3.5 flex flex-col gap-2.5">
        <p className="font-bold text-sm leading-tight">{f.color}</p>

        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-base font-black text-foreground leading-none">{fmtARS(precioUnitario)}</p>
            <p className="text-[10px] text-muted-foreground">por kg</p>
          </div>
          <span
            className="text-[10px] font-black px-2 py-0.5 rounded-full shrink-0"
            style={{ backgroundColor: MAT_COLORS[f.material] ?? '#94a3b8', color: '#fff' }}
          >
            {f.material}
          </span>
        </div>

        {/* CTA */}
        {enCart === 0 ? (
          <button
            onClick={onAdd}
            disabled={disponible === 0}
            className="w-full flex items-center justify-center gap-1.5 text-white text-sm font-bold py-2.5 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#15803d' }}
          >
            <Plus size={14} />
            Agregar al carrito
          </button>
        ) : (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <button
                onClick={() => onSetRollos(enCart - 1)}
                className="flex-none p-2 rounded-lg border border-border hover:bg-secondary transition-colors"
              >
                <Minus size={12} />
              </button>
              <span className="flex-1 text-center text-sm font-bold">{enCart} kg</span>
              <button
                onClick={() => onSetRollos(enCart + 1)}
                disabled={enMax}
                className="flex-none p-2 rounded-lg border border-border hover:bg-secondary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Plus size={12} />
              </button>
            </div>
            {enMax && (
              <p className="text-[10px] text-center text-amber-600 dark:text-amber-400">
                Stock máximo ({disponible} kg)
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function FilamentosShop({ filamentos }: { filamentos: Filamento[] }) {
  const [cart, setCart] = useState<CartItem[]>([])
  const [showCart, setShowCart] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [search, setSearch] = useState('')
  const [matFilter, setMatFilter] = useState<string>('')
  const [marcaFilter, setMarcaFilter] = useState<string>('')

  const [showCheckout, setShowCheckout] = useState(false)
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>('form')
  const [clienteNombre, setClienteNombre] = useState('')
  const [clienteTelefono, setClienteTelefono] = useState('')
  const [pedidoNumero, setPedidoNumero] = useState<number | null>(null)
  const [checkoutError, setCheckoutError] = useState('')
  const [pedidoSnapshot, setPedidoSnapshot] = useState<{ items: typeof cart; kg: number; subtotal: number; descuento: number; descLabel: string } | null>(null)
  const [, startTransition] = useTransition()

  const [user, setUser] = useState<SupabaseUser | null>(null)
  const supabaseRef = useRef(createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ))
  useEffect(() => {
    const supabase = supabaseRef.current
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user ?? null
      setUser(u)
      if (u?.user_metadata?.full_name) setClienteNombre(u.user_metadata.full_name)
      if (u?.user_metadata?.phone) setClienteTelefono(u.user_metadata.phone)
    })
    const { data: { subscription } } = supabaseRef.current.onAuthStateChange((_e, session) => {
      const u = session?.user ?? null
      setUser(u)
      if (u?.user_metadata?.full_name) setClienteNombre(u.user_metadata.full_name)
      if (u?.user_metadata?.phone) setClienteTelefono(u.user_metadata.phone)
    })
    return () => subscription.unsubscribe()
  }, [])

  const marcas = useMemo(() => Array.from(new Set(filamentos.map(f => f.marca))).sort(), [filamentos])
  const materiales = useMemo(() => Array.from(new Set(filamentos.map(f => f.material))).sort(), [filamentos])

  const filtered = useMemo(() => {
    let list = filamentos
    if (matFilter) list = list.filter(f => f.material === matFilter)
    if (marcaFilter) list = list.filter(f => f.marca === marcaFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(f =>
        f.color.toLowerCase().includes(q) ||
        f.nombre.toLowerCase().includes(q) ||
        f.marca.toLowerCase().includes(q)
      )
    }
    return list
  }, [filamentos, matFilter, marcaFilter, search])

  const totalKg = cart.reduce((s, i) => s + i.rollos, 0)
  const { descuento, label: descLabel } = getDescuento(totalKg)
  const precioUnitario = PRECIO_BASE - descuento
  const subtotal = totalKg * precioUnitario

  function addToCart(f: Filamento) {
    const max = maxKg(f)
    setCart(prev => {
      const existing = prev.find(i => i.filamento.id === f.id)
      if (existing) {
        if (existing.rollos >= max) return prev
        return prev.map(i => i.filamento.id === f.id ? { ...i, rollos: i.rollos + 1 } : i)
      }
      return [...prev, { filamento: f, rollos: 1 }]
    })
  }

  function setRollos(id: string, rollos: number) {
    const max = cart.find(i => i.filamento.id === id) ? maxKg(cart.find(i => i.filamento.id === id)!.filamento) : 999
    if (rollos <= 0) setCart(prev => prev.filter(i => i.filamento.id !== id))
    else setCart(prev => prev.map(i => i.filamento.id === id ? { ...i, rollos: Math.min(rollos, max) } : i))
  }

  function removeFromCart(id: string) { setCart(prev => prev.filter(i => i.filamento.id !== id)) }
  function getCartRollos(id: string) { return cart.find(i => i.filamento.id === id)?.rollos ?? 0 }

  function abrirCheckout() {
    if (!cart.length) return
    setShowCheckout(true); setCheckoutStep('form'); setCheckoutError(''); setPedidoNumero(null)
  }

  function abrirWhatsApp(numero: number) {
    const snap = pedidoSnapshot
    if (!snap) return
    const itemLines = snap.items.map(i =>
      `  - ${i.rollos} kg de ${i.filamento.color} (${i.filamento.material} ${i.filamento.marca})`
    )
    const lines = [
      `Hola, soy ${clienteNombre}!`,
      `Hice el pedido N° ${numero} desde la web.`,
      ``,
      `*Detalle:*`,
      ...itemLines,
      ``,
      `*Total: ${fmtARS(snap.subtotal)}*`,
      snap.descuento > 0 ? `Descuento mayorista aplicado: -${fmtARS(snap.descuento)}/kg` : null,
      ``,
      `Quedo esperando confirmacion para coordinar el pago y la entrega.`,
    ].filter(Boolean).join('\n')
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(lines)}`, '_blank')
  }

  function handleConfirmarPedido() {
    if (!clienteNombre.trim()) { setCheckoutError('Tu nombre es requerido'); return }
    setCheckoutError(''); setCheckoutStep('saving')
    startTransition(async () => {
      const result = await crearPedidoFilamento({
        cliente_nombre: clienteNombre, cliente_telefono: clienteTelefono,

        items: cart.map(i => ({
          filamento_id: i.filamento.id, nombre: i.filamento.nombre, color: i.filamento.color,
          material: i.filamento.material, marca: i.filamento.marca, rollos: i.rollos, precio_unitario: precioUnitario,
        })),
        total_rollos: totalKg, descuento_por_rollo: descuento, total: subtotal,
      })
      if (result.error) { setCheckoutError(result.error); setCheckoutStep('form'); return }
      // Guardar teléfono en el perfil del usuario si lo ingresó
      if (user && clienteTelefono.trim()) {
        supabaseRef.current.auth.updateUser({ data: { phone: clienteTelefono.trim() } })
      }
      setPedidoSnapshot({ items: cart, kg: totalKg, subtotal, descuento, descLabel })
      setPedidoNumero(result.numero!); setCheckoutStep('done'); setCart([]); setShowCart(false)
    })
  }

  const hasFilters = !!(search || matFilter || marcaFilter)

  // ── Sidebar content ──────────────────────────────────────────────────────
  const filterSidebar = (
    <div className="space-y-5">
      {/* Búsqueda */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar color..."
          className="w-full text-sm border border-border rounded-xl pl-8 pr-3 py-2.5 bg-background focus:outline-none focus:ring-2 focus:ring-orange-300"
        />
      </div>

      {/* Material */}
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">Material</p>
        <div className="space-y-1">
          <button
            onClick={() => setMatFilter('')}
            className={`w-full text-left text-sm px-3 py-1.5 rounded-lg transition-colors ${!matFilter ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 font-semibold' : 'hover:bg-secondary'}`}
          >
            Todos ({filamentos.length})
          </button>
          {materiales.map(mat => (
            <button
              key={mat}
              onClick={() => setMatFilter(matFilter === mat ? '' : mat)}
              className={`w-full text-left text-sm px-3 py-1.5 rounded-lg transition-colors flex items-center justify-between ${
                matFilter === mat ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 font-semibold' : 'hover:bg-secondary'
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: MAT_COLORS[mat] ?? '#94a3b8' }} />
                {mat}
              </span>
              <span className="text-xs text-muted-foreground">{filamentos.filter(f => f.material === mat).length}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Marca */}
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">Marca</p>
        <div className="space-y-1">
          <button
            onClick={() => setMarcaFilter('')}
            className={`w-full text-left text-sm px-3 py-1.5 rounded-lg transition-colors ${!marcaFilter ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 font-semibold' : 'hover:bg-secondary'}`}
          >
            Todas
          </button>
          {marcas.map(m => (
            <button
              key={m}
              onClick={() => setMarcaFilter(marcaFilter === m ? '' : m)}
              className={`w-full text-left text-sm px-3 py-1.5 rounded-lg transition-colors flex items-center justify-between ${
                marcaFilter === m ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 font-semibold' : 'hover:bg-secondary'
              }`}
            >
              {m}
              <span className="text-xs text-muted-foreground">{filamentos.filter(f => f.marca === m).length}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Descuentos */}
      <div>
        <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: '#22c55e' }}>💰 Descuentos por volumen</p>
        <div className="space-y-1.5">
          {[
            { min:  5, desc: 2000, activeStyle: { backgroundColor: '#166534', color: '#bbf7d0', borderColor: '#16a34a' } },
            { min: 10, desc: 3000, activeStyle: { backgroundColor: '#166534', color: '#d4ef8a', borderColor: '#22c55e' } },
            { min: 15, desc: 4000, activeStyle: { backgroundColor: '#166534', color: '#e0f59a', borderColor: '#4ade80' } },
          ].map(t => {
            const activo = totalKg >= t.min
            const faltan = t.min - totalKg
            const proximo = !activo && faltan <= 2 && faltan > 0
            return (
              <div
                key={t.min}
                className="flex items-center justify-between text-xs rounded-lg px-3 py-2 font-semibold transition-all border"
                style={activo
                  ? { ...t.activeStyle, boxShadow: '0 1px 6px #15803d33' }
                  : proximo
                    ? { backgroundColor: 'oklch(0.24 0.06 145)', color: '#4ade80', borderColor: '#166534' }
                    : { backgroundColor: 'oklch(0.22 0.005 264)', color: 'oklch(0.50 0.006 264)', borderColor: 'oklch(1 0 0 / 8%)' }
                }
              >
                <span>{activo ? '✓ ' : proximo ? '⚡ ' : ''}{t.min}+ kg</span>
                <span>−{fmtARS(t.desc)}/kg</span>
              </div>
            )
          })}
        </div>

        {/* Nudge: "te falta 1 kg para el siguiente tier" */}
        {(() => {
          const tiers = [{ min: 5 }, { min: 10 }, { min: 15 }]
          const siguiente = tiers.find(t => t.min > totalKg)
          if (!siguiente) return null
          const faltan = siguiente.min - totalKg
          if (faltan > 2 || totalKg === 0) return null
          return (
            <p
              className="mt-2 text-[11px] font-bold text-center leading-tight rounded-lg px-2.5 py-2"
              style={{ backgroundColor: 'oklch(0.22 0.05 145)', color: '#4ade80' }}
            >
              ⚡ ¡Agregá {faltan} kg más y bajás el precio!
            </p>
          )
        })()}
      </div>

      {hasFilters && (
        <button onClick={() => { setSearch(''); setMatFilter(''); setMarcaFilter('') }}
          className="w-full text-xs text-center text-muted-foreground hover:text-foreground underline py-1">
          Limpiar filtros
        </button>
      )}
    </div>
  )

  return (
    <div className="relative">

      {/* ── Layout: sidebar + grid ── */}
      <div className="flex gap-6 items-start">

        {/* Sidebar desktop */}
        <aside className="hidden lg:block w-52 shrink-0 sticky top-[72px] bg-card border border-border rounded-2xl p-4">
          {filterSidebar}
        </aside>

        {/* Main */}
        <div className="flex-1 min-w-0">

          {/* Barra top mobile */}
          <div className="flex items-center gap-2 mb-4 lg:hidden">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Buscar color..."
                className="w-full text-sm border border-border rounded-xl pl-8 pr-3 py-2.5 bg-background focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                hasFilters ? 'bg-orange-50 border-orange-300 text-orange-700 dark:bg-orange-900/20 dark:border-orange-700 dark:text-orange-300' : 'border-border hover:bg-secondary'
              }`}
            >
              <SlidersHorizontal size={14} />
              {hasFilters ? 'Filtros ●' : 'Filtros'}
            </button>
          </div>

          {/* Filtros colapsables mobile */}
          {showFilters && (
            <div className="lg:hidden bg-card border border-border rounded-2xl p-4 mb-4">
              {filterSidebar}
            </div>
          )}

          {/* Resultado count */}
          <div className="flex items-center justify-between mb-3 gap-2">
            <p className="text-xs sm:text-sm text-muted-foreground shrink-0">
              {filtered.length} disponible{filtered.length !== 1 ? 's' : ''}
            </p>
            {totalKg > 0 && (
              <p className="text-xs font-semibold text-right truncate" style={{ color: '#22c55e' }}>
                {totalKg} kg · {fmtARS(subtotal)}
                {descuento > 0 && <span className="hidden sm:inline"> ({fmtARS(descuento)}/kg off)</span>}
              </p>
            )}
          </div>

          {/* Grid de productos */}
          {filtered.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <p className="text-4xl mb-3">🔍</p>
              <p className="font-medium">Sin resultados</p>
              <button onClick={() => { setSearch(''); setMatFilter(''); setMarcaFilter('') }}
                className="mt-3 text-sm text-orange-600 underline">Limpiar filtros</button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {filtered.map(f => (
                <FilamentoCard
                  key={f.id} f={f}
                  enCart={getCartRollos(f.id)}
                  onAdd={() => addToCart(f)}
                  onSetRollos={n => setRollos(f.id, n)}
                  precioUnitario={precioUnitario}
                  descuento={descuento}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Botón flotante del carrito ── */}
      {totalKg > 0 && (
        <button
          onClick={() => setShowCart(true)}
          className="fixed bottom-[env(safe-area-inset-bottom,0px)] mb-5 right-3 sm:right-4 z-40 flex items-center gap-2 sm:gap-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 shadow-xl transition-colors max-w-[calc(100vw-24px)] sm:max-w-none"
          style={{ marginBottom: 'max(20px, env(safe-area-inset-bottom, 20px))' }}
        >
          <ShoppingCart size={16} className="shrink-0" />
          <span className="text-xs sm:text-sm font-bold">{totalKg} kg</span>
          <span className="text-xs sm:text-sm font-bold">{fmtARS(subtotal)}</span>
          {descuento > 0 && (
            <span className="hidden xs:inline text-[10px] bg-white/20 font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap">
              -{fmtARS(descuento)}/kg
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
              <button onClick={() => setShowCart(false)} className="p-1.5 rounded-lg hover:bg-secondary">
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {cart.map(item => (
                <div key={item.filamento.id} className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-xl shrink-0 border border-black/10 shadow-sm"
                    style={{ backgroundColor: colorToCss(item.filamento.color) }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{item.filamento.color}</p>
                    <p className="text-xs text-muted-foreground">{item.filamento.marca} · {item.filamento.material}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => setRollos(item.filamento.id, item.rollos - 1)} className="p-1 rounded-md border border-border hover:bg-secondary"><Minus size={11} /></button>
                    <span className="text-sm font-bold w-6 text-center">{item.rollos}</span>
                    <button onClick={() => setRollos(item.filamento.id, item.rollos + 1)} disabled={item.rollos >= maxKg(item.filamento)} className="p-1 rounded-md border border-border hover:bg-secondary disabled:opacity-30"><Plus size={11} /></button>
                    <button onClick={() => removeFromCart(item.filamento.id)} className="p-1 rounded-md hover:bg-red-50 hover:text-red-600 text-muted-foreground ml-0.5"><Trash2 size={11} /></button>
                  </div>
                </div>
              ))}
            </div>

            <div className="px-5 py-4 border-t border-border space-y-3">
              <div className="space-y-1">
                {[{ min: 5, desc: 2000 }, { min: 10, desc: 3000 }, { min: 15, desc: 4000 }].map(t => {
                  const activo = totalKg >= t.min
                  const faltan = t.min - totalKg
                  return (
                    <div key={t.min} className={`text-xs flex justify-between items-center px-2.5 py-1.5 rounded-lg ${activo ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300' : 'text-muted-foreground'}`}>
                      <span>{activo ? '✓' : `+${faltan} kg`} {t.min}+ kg</span>
                      <span className="font-semibold">-{fmtARS(t.desc)}/kg</span>
                    </div>
                  )
                })}
              </div>
              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{totalKg} kg × {fmtARS(precioUnitario)}</span>
                  <span>{fmtARS(subtotal)}</span>
                </div>
                {descuento > 0 && (
                  <div className="flex justify-between text-xs text-orange-600 dark:text-orange-400">
                    <span>Descuento ({descLabel})</span>
                    <span>-{fmtARS(descuento * totalKg)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base pt-2 border-t border-border">
                  <span>Total estimado</span>
                  <span>{fmtARS(subtotal)}</span>
                </div>
                <p className="text-[10px] text-muted-foreground text-center">El vendedor confirmará disponibilidad y precio final</p>
              </div>
              <button
                onClick={() => { setShowCart(false); abrirCheckout() }}
                className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl py-3 text-sm font-bold shadow-sm transition-colors"
              >
                Confirmar pedido →
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

                {/* Resumen del carrito — siempre visible */}
                <div className="px-6 pt-5 space-y-4">
                  <div className="bg-secondary/40 rounded-xl px-4 py-3 space-y-1">
                    {cart.map(i => (
                      <div key={i.filamento.id} className="flex items-center gap-2 text-sm">
                        <span className="w-3 h-3 rounded-full shrink-0 border border-black/10" style={{ backgroundColor: colorToCss(i.filamento.color) }} />
                        <span className="flex-1 truncate text-xs">{i.rollos}x {i.filamento.color} — {i.filamento.material}</span>
                        <span className="text-xs font-mono text-muted-foreground">{fmtARS(i.rollos * precioUnitario)}</span>
                      </div>
                    ))}
                    <div className="border-t border-border mt-2 pt-2 flex justify-between text-sm font-bold">
                      <span>{totalKg} kg</span><span>{fmtARS(subtotal)}</span>
                    </div>
                    {descuento > 0 && (
                      <p className="text-[10px] text-orange-600 dark:text-orange-400 text-center">Descuento: -{fmtARS(descuento)}/kg ({descLabel})</p>
                    )}
                  </div>
                </div>

                {/* Bloque condicional: login o formulario */}
                {!user ? (
                  <div className="px-6 py-6 space-y-4">
                    <div className="text-center space-y-2">
                      <p className="text-sm font-semibold">Iniciá sesión para continuar</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Para hacer un pedido necesitás estar logueado. Esto evita reservas falsas y nos permite contactarte para confirmar.
                      </p>
                    </div>
                    <form action={signInWithGoogleCliente}>
                      <button type="submit"
                        className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-800 border border-gray-300 rounded-xl py-3 text-sm font-semibold shadow-sm transition-colors">
                        <svg width="18" height="18" viewBox="0 0 24 24">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                        </svg>
                        Continuar con Google
                      </button>
                    </form>
                  </div>
                ) : (
                  <div className="px-6 py-5 space-y-4">
                    <div className="flex items-center gap-2.5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl px-3.5 py-2.5">
                      {user.user_metadata?.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={user.user_metadata.avatar_url} alt="" className="w-7 h-7 rounded-full shrink-0" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-green-200 dark:bg-green-700 shrink-0 flex items-center justify-center text-xs font-bold text-green-800 dark:text-green-200">
                          {(user.user_metadata?.full_name ?? user.email ?? '?')[0].toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-green-800 dark:text-green-300 truncate">{user.user_metadata?.full_name ?? user.email}</p>
                        <p className="text-[10px] text-green-600 dark:text-green-400 truncate">{user.email}</p>
                      </div>
                    </div>
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
                      Una vez que confirmes el pedido, revisamos el stock y te avisamos por WhatsApp. Para separar los filamentos se requiere abonar una seña o el total.
                    </p>
                  </div>
                )}

                {user && (
                  <div className="px-6 pb-5">
                    <button onClick={handleConfirmarPedido} disabled={checkoutStep === 'saving' || !clienteNombre.trim()}
                      className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-40 rounded-xl py-3 text-sm font-bold transition-colors">
                      {checkoutStep === 'saving' ? <><Loader2 size={15} className="animate-spin" /> Guardando pedido...</> : 'Hacer el pedido'}
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
                    Avisame por WhatsApp para que revise el stock y confirme. Con una seña o el pago total te los reservo. 🙌
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
    </div>
  )
}
