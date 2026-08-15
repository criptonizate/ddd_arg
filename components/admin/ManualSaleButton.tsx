'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { createManualSale } from '@/lib/actions/orders'
import { getActiveProducts } from '@/lib/actions/products'
import { getClienteNames } from '@/lib/actions/clientes'
import { useToast } from './ToastProvider'
import { formatARS } from '@/lib/utils'
import { Plus, X, Trash2, Loader2, Minus, Percent } from 'lucide-react'
import type { ProductWithVariants } from '@/lib/supabase/types'
import { getProductosSugeridos, type ProductoSugerido } from '@/lib/actions/products'

// ── Autocomplete de clientes ───────────────────────────────────────────────────

function ClienteAutocomplete({
  value,
  onChange,
  clientes,
  placeholder,
}: {
  value: string
  onChange: (nombre: string, telefono: string) => void
  clientes: { nombre: string; telefono: string | null }[]
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(0)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const filtered = value.trim()
    ? clientes.filter((c) => c.nombre.toLowerCase().includes(value.toLowerCase())).slice(0, 8)
    : clientes.slice(0, 6)

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [])

  function select(c: { nombre: string; telefono: string | null }) {
    onChange(c.nombre, c.telefono ?? '')
    setOpen(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open || filtered.length === 0) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlighted((h) => Math.min(h + 1, filtered.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setHighlighted((h) => Math.max(h - 1, 0)) }
    if (e.key === 'Enter' && filtered[highlighted]) { e.preventDefault(); select(filtered[highlighted]) }
    if (e.key === 'Escape') setOpen(false)
  }

  return (
    <div ref={wrapperRef} className="relative">
      <input
        value={value}
        onChange={(e) => { onChange(e.target.value, ''); setOpen(true); setHighlighted(0) }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        autoComplete="off"
        className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        placeholder={placeholder}
      />
      {open && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-[60] mt-1 bg-card border border-border rounded-xl shadow-xl overflow-hidden">
          {value.trim() === '' && (
            <p className="px-3 py-1.5 text-xs text-muted-foreground border-b border-border">Clientes recientes</p>
          )}
          {filtered.map((c, idx) => (
            <button
              key={c.nombre}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); select(c) }}
              onMouseEnter={() => setHighlighted(idx)}
              className={`w-full text-left px-3 py-2.5 text-sm flex items-center justify-between gap-3 transition-colors ${
                idx === highlighted ? 'bg-secondary' : 'hover:bg-secondary/60'
              }`}
            >
              <span className="font-medium">{c.nombre}</span>
              {c.telefono && <span className="text-xs text-muted-foreground shrink-0">{c.telefono}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Selector de cantidad con botones rápidos ───────────────────────────────────

function CantidadSelector({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center gap-1.5">
      {[1, 2, 3].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={`w-9 h-9 rounded-lg text-sm font-bold border transition-colors ${
            value === n
              ? 'bg-foreground text-primary-foreground border-foreground'
              : 'border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground'
          }`}
        >
          {n}
        </button>
      ))}
      <input
        type="number"
        min="1"
        value={value}
        onChange={(e) => onChange(Math.max(1, Number(e.target.value) || 1))}
        className="w-14 h-9 border border-input rounded-lg px-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring text-center font-semibold"
      />
    </div>
  )
}

// ── Tipos ──────────────────────────────────────────────────────────────────────

interface CartItem {
  product_id: string
  variant_id: string
  cantidad: number
  precio_unitario: number
  precio_original: number   // precio de lista sin descuento
  nombre: string
  variante: string
  esLibre?: boolean
}

const EMPTY_FORM = {
  cliente_nombre: '',
  cliente_telefono: '',
  cliente_email: '',
  entrega: 'retiro' as 'retiro' | 'envio',
  direccion_envio: '',
  nota: '',
  metodo_pago: 'efectivo' as string,
  sena: 0,
  prioridad: false,
  esLocal: false,
}

// ── Componente principal ───────────────────────────────────────────────────────

export default function ManualSaleButton() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [products, setProducts] = useState<ProductWithVariants[]>([])
  const [pastClients, setPastClients] = useState<{ nombre: string; telefono: string | null }[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()

  const [selProductId, setSelProductId] = useState('')
  const [selVariantId, setSelVariantId] = useState('')
  const [selCantidad, setSelCantidad] = useState(1)
  const [modoLibre, setModoLibre] = useState(true)
  const [itemLibre, setItemLibre] = useState({ nombre: '', variante: '', precio: '' })
  const [sugeridos, setSugeridos] = useState<ProductoSugerido[]>([])
  const [showSugeridos, setShowSugeridos] = useState(false)
  const [cantidadStr, setCantidadStr] = useState('1')

  async function openModal() {
    setLoading(true)
    const [prods, clients, sug] = await Promise.all([getActiveProducts(), getClienteNames(), getProductosSugeridos()])
    setProducts(prods as ProductWithVariants[])
    setPastClients(clients)
    setSugeridos(sug)
    setLoading(false)
    setOpen(true)
  }

  function closeModal() {
    setOpen(false)
    setCart([])
    setForm(EMPTY_FORM)
    setError(null)
    setSelProductId('')
    setSelVariantId('')
    setSelCantidad(1)
    setModoLibre(true)
    setItemLibre({ nombre: '', variante: '', precio: '' })
    setCantidadStr('1')
    setShowSugeridos(false)
  }

  function handleClienteSelect(nombre: string, telefono: string) {
    setForm((f) => ({ ...f, cliente_nombre: nombre, cliente_telefono: telefono || f.cliente_telefono }))
  }

  function addItem() {
    const product = products.find((p) => p.id === selProductId)
    const variant = product?.product_variants.find((v) => v.id === selVariantId)
    if (!product || !variant) return
    const precio = variant.precio ?? product.precio_base
    setCart((prev) => {
      const existing = prev.find((i) => i.variant_id === selVariantId)
      if (existing) {
        return prev.map((i) =>
          i.variant_id === selVariantId ? { ...i, cantidad: i.cantidad + selCantidad } : i
        )
      }
      return [...prev, {
        product_id: selProductId, variant_id: selVariantId, cantidad: selCantidad,
        precio_unitario: precio, precio_original: precio,
        nombre: product.nombre, variante: variant.nombre_variante,
      }]
    })
    setSelCantidad(1)
  }

  function addItemLibre() {
    if (!itemLibre.nombre.trim() || !itemLibre.precio) return
    const precio = parseFloat(itemLibre.precio)
    if (isNaN(precio) || precio <= 0) return
    setCart((prev) => [...prev, {
      product_id: '', variant_id: '', cantidad: selCantidad,
      precio_unitario: precio, precio_original: precio,
      nombre: itemLibre.nombre.trim(), variante: itemLibre.variante.trim(), esLibre: true,
    }])
    setItemLibre({ nombre: '', variante: '', precio: '' })
    setSelCantidad(1)
  }

  function updateCartCantidad(idx: number, delta: number) {
    setCart((prev) => prev.map((item, i) => i === idx
      ? { ...item, cantidad: Math.max(1, item.cantidad + delta) }
      : item
    ))
  }

  function updateCartPrecio(idx: number, nuevoPrecio: number) {
    setCart((prev) => prev.map((item, i) => i === idx
      ? { ...item, precio_unitario: Math.max(0, nuevoPrecio) }
      : item
    ))
  }

  function updateCartDescuentoPct(idx: number, pct: number) {
    setCart((prev) => prev.map((item, i) => {
      if (i !== idx) return item
      const nuevo = Math.round(item.precio_original * (1 - pct / 100))
      return { ...item, precio_unitario: Math.max(0, nuevo) }
    }))
  }

  const total = cart.reduce((s, i) => s + i.cantidad * i.precio_unitario, 0)
  const selectedProduct = products.find((p) => p.id === selProductId)

  function handleSubmit(overrides?: { esLocal?: boolean; sena?: number }) {
    setError(null)
    if (!form.cliente_nombre.trim()) { setError('El nombre del cliente es obligatorio'); return }
    if (cart.length === 0) { setError('Agregá al menos un producto'); return }
    startTransition(async () => {
      const res = await createManualSale({
        ...form,
        ...overrides,
        metodo_pago: form.metodo_pago as any,
        sena: overrides?.sena ?? form.sena,
        prioridad: form.prioridad,
        items: cart.map((i) => ({
          product_id: i.product_id || '',
          variant_id: i.variant_id || '',
          cantidad: i.cantidad,
          precio_unitario: i.precio_unitario,
          precio_original: i.precio_unitario < i.precio_original ? i.precio_original : null,
          nombre_producto: i.nombre,
          nombre_variante: i.variante,
        })),
      })
      if (res?.error) {
        if (typeof res.error === 'string') {
          setError(res.error)
        } else {
          const msgs = Object.values(res.error as Record<string, string[]>).flat()
          setError(msgs[0] ?? 'Error al registrar la venta')
        }
      } else {
        toast(`Venta registrada — ${form.cliente_nombre} · ${formatARS(total)}`)
        closeModal()
      }
    })
  }

  return (
    <>
      <button
        onClick={openModal}
        disabled={loading}
        className="inline-flex items-center gap-2 border border-border hover:bg-secondary hover:border-foreground/30 transition-colors rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-70"
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
        {loading ? 'Cargando...' : 'Venta manual'}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/40" onClick={closeModal} />
          <div className="relative bg-card rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">

            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border sticky top-0 bg-card z-10">
              <h2 className="text-lg font-semibold">Registrar venta</h2>
              <button onClick={closeModal} className="p-1.5 rounded-lg hover:bg-secondary">
                <X size={16} />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-6">
              {error && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              {/* ── Datos del cliente ── */}
              <div>
                <h3 className="text-sm font-semibold mb-3">Datos del cliente</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium mb-1 block">Nombre *</label>
                    <ClienteAutocomplete
                      value={form.cliente_nombre}
                      onChange={handleClienteSelect}
                      clientes={pastClients}
                      placeholder="Juan García"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block">Teléfono</label>
                    <input
                      value={form.cliente_telefono}
                      onChange={(e) => setForm({ ...form, cliente_telefono: e.target.value })}
                      className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="11 1234-5678"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block">Entrega</label>
                    <select
                      value={form.entrega}
                      onChange={(e) => setForm({ ...form, entrega: e.target.value as any })}
                      className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="retiro">Retiro en persona</option>
                      <option value="envio">Envío</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block">Método de pago</label>
                    <select
                      value={form.metodo_pago}
                      onChange={(e) => setForm({ ...form, metodo_pago: e.target.value })}
                      className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="efectivo">💵 Efectivo</option>
                      <option value="transferencia">🏦 Transferencia</option>
                      <option value="mercadopago">💙 Mercado Pago</option>
                    </select>
                  </div>
                  {form.entrega === 'envio' && (
                    <div className="col-span-1 sm:col-span-2">
                      <label className="text-xs font-medium mb-1 block">Dirección *</label>
                      <input
                        value={form.direccion_envio}
                        onChange={(e) => setForm({ ...form, direccion_envio: e.target.value })}
                        className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                  )}
                  <div className="col-span-1 sm:col-span-2">
                    <label className="text-xs font-medium mb-1 block">Nota (opcional)</label>
                    <input
                      value={form.nota}
                      onChange={(e) => setForm({ ...form, nota: e.target.value })}
                      className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block">Seña recibida</label>
                    <input
                      type="number" min="0"
                      value={form.sena || ''}
                      onChange={(e) => setForm({ ...form, sena: Number(e.target.value) })}
                      className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="0"
                    />
                  </div>
                  <div className="flex items-end pb-2 gap-4 flex-wrap">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox" checked={form.prioridad}
                        onChange={(e) => setForm({ ...form, prioridad: e.target.checked })}
                        className="w-4 h-4 rounded border-input accent-red-600"
                      />
                      <span className="text-xs font-medium">🔥 Urgente</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox" checked={form.esLocal}
                        onChange={(e) => setForm({ ...form, esLocal: e.target.checked })}
                        className="w-4 h-4 rounded border-input accent-orange-500"
                      />
                      <span className="text-xs font-medium">🏪 Venta local</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* ── Agregar productos ── */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold">Agregar productos</h3>
                  <div className="flex rounded-lg border border-border overflow-hidden text-xs font-medium">
                    <button
                      type="button"
                      onClick={() => setModoLibre(false)}
                      className={`px-3 py-1.5 transition-colors ${!modoLibre ? 'bg-foreground text-primary-foreground' : 'text-muted-foreground hover:bg-secondary'}`}
                    >
                      Del catálogo
                    </button>
                    <button
                      type="button"
                      onClick={() => setModoLibre(true)}
                      className={`px-3 py-1.5 transition-colors ${modoLibre ? 'bg-foreground text-primary-foreground' : 'text-muted-foreground hover:bg-secondary'}`}
                    >
                      Ítem libre
                    </button>
                  </div>
                </div>

                {!modoLibre ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs font-medium mb-1 block">Producto</label>
                        <select
                          value={selProductId}
                          onChange={(e) => { setSelProductId(e.target.value); setSelVariantId('') }}
                          className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                          <option value="">Seleccionar producto...</option>
                          {products.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-medium mb-1 block">Variante</label>
                        <select
                          value={selVariantId}
                          onChange={(e) => setSelVariantId(e.target.value)}
                          className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                          disabled={!selProductId}
                        >
                          <option value="">Elegir variante...</option>
                          {selectedProduct?.product_variants.map((v) => (
                            <option key={v.id} value={v.id}>{v.nombre_variante} ({v.stock} disp.)</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="flex items-end gap-3 flex-wrap">
                      <div>
                        <label className="text-xs font-medium mb-1.5 block">Cantidad</label>
                        <CantidadSelector value={selCantidad} onChange={setSelCantidad} />
                      </div>
                      <button
                        onClick={addItem}
                        disabled={!selVariantId}
                        className="h-9 px-5 rounded-lg bg-foreground text-primary-foreground hover:bg-foreground/90 disabled:opacity-40 transition-colors flex items-center gap-2 text-sm font-medium"
                      >
                        <Plus size={15} /> Agregar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {/* Nombre con autocomplete */}
                      <div className="relative">
                        <label className="text-xs font-medium mb-1 block">Nombre</label>
                        <input
                          value={itemLibre.nombre}
                          onChange={(e) => {
                            setItemLibre((l) => ({ ...l, nombre: e.target.value }))
                            setShowSugeridos(true)
                          }}
                          onFocus={() => setShowSugeridos(true)}
                          onBlur={() => setTimeout(() => setShowSugeridos(false), 150)}
                          placeholder="Ej: Llavero personalizado"
                          className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                          onKeyDown={(e) => e.key === 'Enter' && addItemLibre()}
                          autoComplete="off"
                        />
                        {showSugeridos && (() => {
                          const q = itemLibre.nombre.toLowerCase()
                          const matches = sugeridos
                            .filter((s) => !q || s.nombre.toLowerCase().includes(q))
                            .slice(0, 7)
                          if (!matches.length) return null
                          return (
                            <div className="absolute top-full left-0 right-0 z-[60] mt-1 bg-card border border-border rounded-xl shadow-xl overflow-hidden">
                              {matches.map((s, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onMouseDown={(e) => {
                                    e.preventDefault()
                                    setItemLibre({ nombre: s.nombre, variante: s.variante ?? '', precio: String(s.ultimo_precio) })
                                    setShowSugeridos(false)
                                  }}
                                  className="w-full text-left px-3 py-2 text-sm flex items-center justify-between gap-3 hover:bg-secondary transition-colors"
                                >
                                  <div className="min-w-0">
                                    <span className="font-medium">{s.nombre}</span>
                                    {s.variante && <span className="text-muted-foreground text-xs ml-1">— {s.variante}</span>}
                                  </div>
                                  <span className="text-xs text-muted-foreground shrink-0">{formatARS(s.ultimo_precio)}</span>
                                </button>
                              ))}
                            </div>
                          )
                        })()}
                      </div>
                      <div>
                        <label className="text-xs font-medium mb-1 block">Variante <span className="text-muted-foreground font-normal">(opc.)</span></label>
                        <input
                          value={itemLibre.variante}
                          onChange={(e) => setItemLibre((l) => ({ ...l, variante: e.target.value }))}
                          placeholder="Ej: Azul"
                          className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                          onKeyDown={(e) => e.key === 'Enter' && addItemLibre()}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium mb-1 block">Precio $</label>
                        <input
                          type="number" min="0" step="any"
                          value={itemLibre.precio}
                          onChange={(e) => setItemLibre((l) => ({ ...l, precio: e.target.value }))}
                          placeholder="0"
                          className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                          onKeyDown={(e) => e.key === 'Enter' && addItemLibre()}
                        />
                      </div>
                    </div>
                    <div className="flex items-end gap-3 flex-wrap">
                      <div>
                        <label className="text-xs font-medium mb-1.5 block">Cantidad</label>
                        <div className="flex items-center gap-1.5">
                          {[1, 2, 3].map((n) => (
                            <button key={n} type="button" onClick={() => { setSelCantidad(n); setCantidadStr(String(n)) }}
                              className={`w-9 h-9 rounded-lg text-sm font-bold border transition-colors ${selCantidad === n ? 'bg-foreground text-primary-foreground border-foreground' : 'border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground'}`}>
                              {n}
                            </button>
                          ))}
                          <input
                            type="number" min="1"
                            value={cantidadStr}
                            onChange={(e) => {
                              setCantidadStr(e.target.value)
                              const n = parseInt(e.target.value)
                              if (!isNaN(n) && n >= 1) setSelCantidad(n)
                            }}
                            onBlur={() => {
                              const n = parseInt(cantidadStr)
                              const v = isNaN(n) || n < 1 ? 1 : n
                              setSelCantidad(v)
                              setCantidadStr(String(v))
                            }}
                            className="w-14 h-9 border border-input rounded-lg px-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring text-center font-semibold"
                          />
                        </div>
                      </div>
                      <button
                        onClick={addItemLibre}
                        disabled={!itemLibre.nombre.trim() || !itemLibre.precio}
                        className="h-9 px-5 rounded-lg bg-foreground text-primary-foreground hover:bg-foreground/90 disabled:opacity-40 transition-colors flex items-center gap-2 text-sm font-medium"
                      >
                        <Plus size={15} /> Agregar
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* ── Carrito ── */}
              {cart.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-2">Pedido</h3>
                  <div className="space-y-2">
                    {cart.map((item, idx) => {
                      const tieneDescuento = item.precio_unitario < item.precio_original
                      const descPct = tieneDescuento
                        ? Math.round((1 - item.precio_unitario / item.precio_original) * 100)
                        : 0
                      return (
                        <div key={idx} className="p-3 bg-secondary/30 rounded-xl text-sm space-y-2">
                          {/* Fila 1: nombre + cantidad + eliminar */}
                          <div className="flex items-center gap-3">
                            <div className="min-w-0 flex-1">
                              <p className="font-medium leading-tight">{item.nombre}</p>
                              {item.variante && (
                                <p className="text-xs text-muted-foreground mt-0.5">{item.variante}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button type="button" onClick={() => updateCartCantidad(idx, -1)}
                                className="w-7 h-7 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
                                <Minus size={12} />
                              </button>
                              <span className="w-8 text-center font-bold text-sm">{item.cantidad}</span>
                              <button type="button" onClick={() => updateCartCantidad(idx, +1)}
                                className="w-7 h-7 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
                                <Plus size={12} />
                              </button>
                            </div>
                            <button type="button" onClick={() => setCart((prev) => prev.filter((_, i) => i !== idx))}
                              className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0">
                              <Trash2 size={13} />
                            </button>
                          </div>
                          {/* Fila 2: precio unitario + descuento + total */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-muted-foreground">$ c/u</span>
                              <input
                                type="number" min="0"
                                value={item.precio_unitario || ''}
                                onChange={(e) => updateCartPrecio(idx, Number(e.target.value))}
                                className="w-24 h-7 border border-input rounded-lg px-2 text-xs bg-background focus:outline-none focus:ring-2 focus:ring-ring text-right font-semibold"
                              />
                            </div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Percent size={11} />
                              <input
                                type="number" min="0" max="99"
                                value={descPct || ''}
                                onChange={(e) => updateCartDescuentoPct(idx, Number(e.target.value))}
                                placeholder="desc."
                                className="w-14 h-7 border border-input rounded-lg px-2 text-xs bg-background focus:outline-none focus:ring-2 focus:ring-ring text-center"
                              />
                            </div>
                            {tieneDescuento && (
                              <span className="text-xs text-green-600 font-semibold">−{descPct}% desc.</span>
                            )}
                            <span className="ml-auto font-bold text-sm">
                              {formatARS(item.cantidad * item.precio_unitario)}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                    <div className="flex justify-between pt-2 items-center border-t border-border">
                      <span className="text-xs text-muted-foreground">{cart.length} producto{cart.length > 1 ? 's' : ''}</span>
                      <span className="text-base font-bold">Total: {formatARS(total)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 p-4 sm:p-6 border-t border-border sticky bottom-0 bg-card flex-wrap">
              <button
                onClick={closeModal}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-border hover:bg-secondary transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleSubmit({ esLocal: true, sena: total })}
                disabled={isPending || cart.length === 0}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-60 transition-colors"
              >
                {isPending ? '...' : `✓ Pagado — ${formatARS(total)}`}
              </button>
              <button
                onClick={() => handleSubmit()}
                disabled={isPending || cart.length === 0}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-foreground text-primary-foreground hover:bg-foreground/90 disabled:opacity-60 transition-colors"
              >
                {isPending ? 'Registrando...' : `Confirmar — ${formatARS(total)}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
