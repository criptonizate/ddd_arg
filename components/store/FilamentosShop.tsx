'use client'

import { useState, useMemo } from 'react'
import { ShoppingCart, Plus, Minus, X, Trash2 } from 'lucide-react'
import type { Filamento } from '@/lib/filamentos-helpers'

const WHATSAPP_NUMBER = '543804559909'
const PRECIO_BASE = 22000  // precio por rollo (1kg) sin descuento

// Descuentos públicos por volumen (total rollos en el carrito)
const DESCUENTOS = [
  { min: 15, descuento: 4000, label: '15+ rollos' },
  { min: 10, descuento: 3000, label: '10+ rollos' },
  { min:  5, descuento: 2000, label:  '5+ rollos' },
  { min:  0, descuento:    0, label:         '' },
] as const

function getDescuento(totalRollos: number): { descuento: number; label: string } {
  return DESCUENTOS.find(t => totalRollos >= t.min) ?? { descuento: 0, label: '' }
}

function colorToCss(color: string): string {
  const c = color.toLowerCase()
  if (c.includes('black'))                            return '#111111'
  if (c.includes('white'))                            return '#f5f5f5'
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

type CartItem = { filamento: Filamento; rollos: number }

const MATERIAL_BADGE: Record<string, string> = {
  PLA:  'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  PETG: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  TPU:  'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  ABS:  'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  ASA:  'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
}

export default function FilamentosShop({ filamentos }: { filamentos: Filamento[] }) {
  const [cart, setCart] = useState<CartItem[]>([])
  const [showCart, setShowCart] = useState(false)
  const [search, setSearch] = useState('')
  const [matFilter, setMatFilter] = useState<string>('')
  const [marcaFilter, setMarcaFilter] = useState<string>('')

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

  const totalRollos = cart.reduce((s, i) => s + i.rollos, 0)
  const { descuento, label: descLabel } = getDescuento(totalRollos)
  const precioUnitario = PRECIO_BASE - descuento
  const subtotal = totalRollos * precioUnitario

  function addToCart(f: Filamento) {
    setCart(prev => {
      const existing = prev.find(i => i.filamento.id === f.id)
      if (existing) return prev.map(i => i.filamento.id === f.id ? { ...i, rollos: i.rollos + 1 } : i)
      return [...prev, { filamento: f, rollos: 1 }]
    })
  }

  function setRollos(id: string, rollos: number) {
    if (rollos <= 0) setCart(prev => prev.filter(i => i.filamento.id !== id))
    else setCart(prev => prev.map(i => i.filamento.id === id ? { ...i, rollos } : i))
  }

  function removeFromCart(id: string) {
    setCart(prev => prev.filter(i => i.filamento.id !== id))
  }

  function getCartRollos(id: string) {
    return cart.find(i => i.filamento.id === id)?.rollos ?? 0
  }

  function handleCheckout() {
    if (!cart.length) return
    const nextTier = DESCUENTOS.find(t => t.min > totalRollos && t.min > 0)

    const lines: string[] = [
      'Hola! Me gustaría hacer un pedido de filamentos:',
      '',
      '🎨 *Detalle del pedido:*',
      ...cart.map(i =>
        `• ${i.rollos}x ${i.filamento.color} — ${i.filamento.material} (${i.filamento.marca} ${shortNombre(i.filamento.nombre)})`
      ),
      '',
      `📦 Total: *${totalRollos} rollo${totalRollos !== 1 ? 's'  : ''}*`,
    ]

    if (descuento > 0) {
      lines.push(`🏷️ Descuento por volumen (${descLabel}): -${fmtARS(descuento)} por rollo`)
    }
    lines.push(`💰 *Total estimado: ${fmtARS(subtotal)}*`)

    if (nextTier && nextTier.descuento > 0) {
      const faltanRollos = nextTier.min - totalRollos
      lines.push(``)
      lines.push(`💡 Agregando ${faltanRollos} rollo${faltanRollos !== 1 ? 's' : ''} más obtenés -${fmtARS(nextTier.descuento)}/rollo`)
    }

    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(lines.join('\n'))}`
    window.open(url, '_blank')
  }

  return (
    <div className="relative">

      {/* ── Filtros ── */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <input
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar color, marca..."
          className="flex-1 min-w-[160px] text-sm border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-foreground/20"
        />
        <div className="flex flex-wrap gap-1.5">
          {materiales.map(mat => (
            <button
              key={mat}
              onClick={() => setMatFilter(matFilter === mat ? '' : mat)}
              className={`text-xs font-semibold px-2.5 py-1 rounded-full border transition-colors ${
                matFilter === mat
                  ? (MATERIAL_BADGE[mat] ?? 'bg-secondary text-foreground') + ' border-transparent'
                  : 'border-border text-muted-foreground hover:border-foreground/30'
              }`}
            >
              {mat}
            </button>
          ))}
        </div>
        <select
          value={marcaFilter}
          onChange={e => setMarcaFilter(e.target.value)}
          className="text-sm border border-border rounded-lg px-3 py-2 bg-background text-muted-foreground focus:outline-none"
        >
          <option value="">Todas las marcas</option>
          {marcas.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        {(search || matFilter || marcaFilter) && (
          <button
            onClick={() => { setSearch(''); setMatFilter(''); setMarcaFilter('') }}
            className="text-xs text-muted-foreground hover:text-foreground underline"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* ── Descuentos banner ── */}
      <div className="mb-6 flex flex-wrap gap-2">
        {[
          { min: 5, desc: 2000 }, { min: 10, desc: 3000 }, { min: 15, desc: 4000 },
        ].map(t => (
          <div key={t.min} className={`text-xs px-3 py-1.5 rounded-full border flex items-center gap-1.5 transition-all ${
            totalRollos >= t.min
              ? 'bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-700 text-green-800 dark:text-green-300 font-semibold'
              : 'border-border text-muted-foreground'
          }`}>
            {totalRollos >= t.min && '✓ '}
            {t.min}+ rollos → -{fmtARS(t.desc)}/rollo
          </div>
        ))}
      </div>

      {/* ── Grid de filamentos ── */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-4xl mb-3">🔍</p>
          <p className="font-medium">Sin resultados para esa búsqueda</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(f => {
            const enCart = getCartRollos(f.id)
            return (
              <div
                key={f.id}
                className={`bg-card border rounded-xl p-4 flex flex-col gap-3 transition-all ${
                  enCart > 0 ? 'border-foreground/40 shadow-sm' : 'border-border'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span
                    className="w-10 h-10 rounded-full shrink-0 border border-black/10 shadow-sm mt-0.5"
                    style={{ backgroundColor: colorToCss(f.color) }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{f.color}</p>
                    <p className="text-xs text-muted-foreground truncate">{f.marca} · {shortNombre(f.nombre)}</p>
                    <span className={`inline-block mt-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${MATERIAL_BADGE[f.material] ?? 'bg-secondary text-foreground'}`}>
                      {f.material}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold">{fmtARS(precioUnitario)}</p>
                    {descuento > 0 && (
                      <p className="text-[10px] text-muted-foreground line-through">{fmtARS(PRECIO_BASE)}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground">por rollo</p>
                  </div>
                </div>

                {/* Cantidad */}
                {enCart === 0 ? (
                  <button
                    onClick={() => addToCart(f)}
                    className="w-full flex items-center justify-center gap-2 text-sm font-medium border border-border rounded-lg py-2 hover:bg-secondary transition-colors"
                  >
                    <Plus size={14} />
                    Agregar
                  </button>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <button
                      onClick={() => setRollos(f.id, enCart - 1)}
                      className="p-1.5 rounded-lg border border-border hover:bg-secondary transition-colors"
                    >
                      <Minus size={13} />
                    </button>
                    <span className="text-sm font-bold flex-1 text-center">{enCart} rollo{enCart !== 1 ? 's' : ''}</span>
                    <button
                      onClick={() => setRollos(f.id, enCart + 1)}
                      className="p-1.5 rounded-lg border border-border hover:bg-secondary transition-colors"
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Botón flotante del carrito ── */}
      {totalRollos > 0 && (
        <button
          onClick={() => setShowCart(true)}
          className="fixed bottom-6 right-4 z-40 flex items-center gap-2.5 bg-foreground text-background rounded-2xl px-4 py-3 shadow-xl hover:opacity-90 transition-opacity"
        >
          <ShoppingCart size={18} />
          <span className="text-sm font-bold">{totalRollos} rollo{totalRollos !== 1 ? 's' : ''}</span>
          <span className="text-sm">{fmtARS(subtotal)}</span>
          {descLabel && (
            <span className="text-[10px] bg-green-400 text-black font-bold px-1.5 py-0.5 rounded-full">
              -{fmtARS(descuento)}/rol
            </span>
          )}
        </button>
      )}

      {/* ── Panel del carrito ── */}
      {showCart && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setShowCart(false)} />
          <div className="w-full max-w-sm bg-background border-l border-border flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="font-bold text-base">Tu pedido</h2>
              <button onClick={() => setShowCart(false)} className="p-1.5 rounded-lg hover:bg-secondary">
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {cart.map(item => (
                <div key={item.filamento.id} className="flex items-center gap-3">
                  <span
                    className="w-8 h-8 rounded-full shrink-0 border border-black/10"
                    style={{ backgroundColor: colorToCss(item.filamento.color) }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.filamento.color} — {item.filamento.material}</p>
                    <p className="text-xs text-muted-foreground truncate">{item.filamento.marca}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => setRollos(item.filamento.id, item.rollos - 1)} className="p-1 rounded-md border border-border hover:bg-secondary">
                      <Minus size={11} />
                    </button>
                    <span className="text-sm font-bold w-5 text-center">{item.rollos}</span>
                    <button onClick={() => setRollos(item.filamento.id, item.rollos + 1)} className="p-1 rounded-md border border-border hover:bg-secondary">
                      <Plus size={11} />
                    </button>
                    <button onClick={() => removeFromCart(item.filamento.id)} className="p-1 rounded-md hover:bg-red-50 hover:text-red-600 text-muted-foreground">
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Totales */}
            <div className="px-5 py-4 border-t border-border space-y-3">
              {/* Tiers */}
              <div className="space-y-1">
                {[{ min: 5, desc: 2000 }, { min: 10, desc: 3000 }, { min: 15, desc: 4000 }].map(t => {
                  const activo = totalRollos >= t.min
                  const faltan = t.min - totalRollos
                  return (
                    <div key={t.min} className={`text-xs flex justify-between items-center px-2.5 py-1.5 rounded-lg ${
                      activo ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300' : 'text-muted-foreground'
                    }`}>
                      <span>{activo ? '✓' : `+${faltan}`} {t.min}+ rollos</span>
                      <span className="font-semibold">-{fmtARS(t.desc)}/rollo</span>
                    </div>
                  )
                })}
              </div>

              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{totalRollos} rollo{totalRollos !== 1 ? 's' : ''} × {fmtARS(precioUnitario)}</span>
                  <span>{fmtARS(subtotal)}</span>
                </div>
                {descuento > 0 && (
                  <div className="flex justify-between text-xs text-green-600 dark:text-green-400">
                    <span>Descuento ({descLabel})</span>
                    <span>-{fmtARS(descuento * totalRollos)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base pt-1 border-t border-border mt-2">
                  <span>Total estimado</span>
                  <span>{fmtARS(subtotal)}</span>
                </div>
                <p className="text-[10px] text-muted-foreground text-center">El vendedor confirmará disponibilidad y precio final</p>
              </div>

              <button
                onClick={handleCheckout}
                className="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1ebe5a] text-white rounded-xl py-3 text-sm font-bold shadow-sm transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                  <path d="M11.999 2C6.477 2 2 6.477 2 12c0 1.936.53 3.744 1.452 5.29L2.046 22l4.799-1.396A9.956 9.956 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 11.999 2zm.001 18a7.96 7.96 0 01-4.073-1.117l-.291-.174-3.028.881.86-3.105-.19-.3A7.96 7.96 0 014 12c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8-8 8z" />
                </svg>
                Pedir por WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
