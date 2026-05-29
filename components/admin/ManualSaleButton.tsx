'use client'

import { useState, useTransition } from 'react'
import { createManualSale } from '@/lib/actions/orders'
import { getActiveProducts } from '@/lib/actions/products'
import { formatARS } from '@/lib/utils'
import { Plus, X, Trash2 } from 'lucide-react'
import type { ProductWithVariants } from '@/lib/supabase/types'

interface CartItem {
  product_id: string
  variant_id: string
  cantidad: number
  precio_unitario: number
  nombre: string
  variante: string
}

export default function ManualSaleButton() {
  const [open, setOpen] = useState(false)
  const [products, setProducts] = useState<ProductWithVariants[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [form, setForm] = useState({
    cliente_nombre: '',
    cliente_telefono: '',
    cliente_email: '',
    entrega: 'retiro' as 'retiro' | 'envio',
    direccion_envio: '',
    nota: '',
    metodo_pago: 'efectivo' as string,
  })
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Selector temporal de producto/variante
  const [selProductId, setSelProductId] = useState('')
  const [selVariantId, setSelVariantId] = useState('')
  const [selCantidad, setSelCantidad] = useState(1)

  async function openModal() {
    const prods = await getActiveProducts()
    setProducts(prods as ProductWithVariants[])
    setOpen(true)
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
          i.variant_id === selVariantId
            ? { ...i, cantidad: i.cantidad + selCantidad }
            : i
        )
      }
      return [
        ...prev,
        {
          product_id: selProductId,
          variant_id: selVariantId,
          cantidad: selCantidad,
          precio_unitario: precio,
          nombre: product.nombre,
          variante: variant.nombre_variante,
        },
      ]
    })
    setSelCantidad(1)
  }

  const total = cart.reduce((s, i) => s + i.cantidad * i.precio_unitario, 0)

  function handleSubmit() {
    setError(null)
    if (cart.length === 0) {
      setError('Agregá al menos un producto')
      return
    }
    startTransition(async () => {
      const res = await createManualSale({
        ...form,
        metodo_pago: form.metodo_pago as any,
        items: cart.map((i) => ({
          product_id: i.product_id,
          variant_id: i.variant_id,
          cantidad: i.cantidad,
          precio_unitario: i.precio_unitario,
        })),
      })
      if (res?.error) {
        setError(typeof res.error === 'string' ? res.error : 'Error al registrar la venta')
      } else {
        setOpen(false)
        setCart([])
        setForm({
          cliente_nombre: '',
          cliente_telefono: '',
          cliente_email: '',
          entrega: 'retiro',
          direccion_envio: '',
          nota: '',
          metodo_pago: 'efectivo',
        })
      }
    })
  }

  const selectedProduct = products.find((p) => p.id === selProductId)

  return (
    <>
      <button
        onClick={openModal}
        className="inline-flex items-center gap-2 bg-foreground text-primary-foreground hover:bg-foreground/90 transition-colors rounded-lg px-4 py-2 text-sm font-medium"
      >
        <Plus size={16} />
        Venta manual
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative bg-card rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-lg font-semibold">Registrar venta manual</h2>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-secondary">
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {error && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              {/* Datos del cliente */}
              <div>
                <h3 className="text-sm font-semibold mb-3">Datos del cliente</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium mb-1 block">Nombre *</label>
                    <input
                      value={form.cliente_nombre}
                      onChange={(e) => setForm({ ...form, cliente_nombre: e.target.value })}
                      className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="Juan García"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block">Teléfono *</label>
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
                      <option value="efectivo">Efectivo</option>
                      <option value="transferencia">Transferencia</option>
                      <option value="mercadopago">Mercado Pago</option>
                    </select>
                  </div>
                  {form.entrega === 'envio' && (
                    <div className="col-span-2">
                      <label className="text-xs font-medium mb-1 block">Dirección</label>
                      <input
                        value={form.direccion_envio}
                        onChange={(e) => setForm({ ...form, direccion_envio: e.target.value })}
                        className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                  )}
                  <div className="col-span-2">
                    <label className="text-xs font-medium mb-1 block">Nota (opcional)</label>
                    <input
                      value={form.nota}
                      onChange={(e) => setForm({ ...form, nota: e.target.value })}
                      className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>
              </div>

              {/* Agregar productos */}
              <div>
                <h3 className="text-sm font-semibold mb-3">Agregar productos</h3>
                <div className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-5">
                    <label className="text-xs font-medium mb-1 block">Producto</label>
                    <select
                      value={selProductId}
                      onChange={(e) => {
                        setSelProductId(e.target.value)
                        setSelVariantId('')
                      }}
                      className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="">Seleccionar...</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>{p.nombre}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-4">
                    <label className="text-xs font-medium mb-1 block">Variante</label>
                    <select
                      value={selVariantId}
                      onChange={(e) => setSelVariantId(e.target.value)}
                      className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                      disabled={!selProductId}
                    >
                      <option value="">Variante...</option>
                      {selectedProduct?.product_variants.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.nombre_variante} ({v.stock} disponibles)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-medium mb-1 block">Cant.</label>
                    <input
                      type="number"
                      min="1"
                      value={selCantidad}
                      onChange={(e) => setSelCantidad(Number(e.target.value))}
                      className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div className="col-span-1">
                    <button
                      onClick={addItem}
                      disabled={!selVariantId}
                      className="w-full py-2 rounded-lg bg-foreground text-primary-foreground hover:bg-foreground/90 disabled:opacity-40 transition-colors flex items-center justify-center"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Carrito */}
              {cart.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-2">Pedido</h3>
                  <div className="space-y-2">
                    {cart.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg text-sm"
                      >
                        <div>
                          <span className="font-medium">{item.nombre}</span>
                          <span className="text-muted-foreground"> — {item.variante}</span>
                          <span className="text-muted-foreground"> × {item.cantidad}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">
                            {formatARS(item.cantidad * item.precio_unitario)}
                          </span>
                          <button
                            onClick={() => setCart((prev) => prev.filter((_, i) => i !== idx))}
                            className="p-1 rounded hover:bg-secondary"
                          >
                            <Trash2 size={12} className="text-muted-foreground" />
                          </button>
                        </div>
                      </div>
                    ))}
                    <div className="flex justify-end pt-1">
                      <span className="text-base font-bold">Total: {formatARS(total)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 p-6 border-t border-border">
              <button
                onClick={() => setOpen(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-border hover:bg-secondary transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={isPending || cart.length === 0}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-foreground text-primary-foreground hover:bg-foreground/90 disabled:opacity-60 transition-colors"
              >
                {isPending ? 'Registrando...' : `Confirmar venta — ${formatARS(total)}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
