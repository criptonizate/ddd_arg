'use client'

import { useState, useTransition } from 'react'
import { createPedido } from '@/lib/actions/pedidos'
import { formatARS } from '@/lib/utils'
import { Plus, X, Trash2 } from 'lucide-react'

interface CartItem {
  nombre: string
  observacion: string
  cantidad: number
  precio_unitario: number
}

export default function NuevoPedidoButton() {
  const [open, setOpen] = useState(false)
  const [cart, setCart] = useState<CartItem[]>([])
  const [form, setForm] = useState({
    cliente_nombre: '',
    cliente_telefono: '',
    origen: 'whatsapp' as 'whatsapp' | 'instagram' | 'manual',
    entrega: 'retiro' as 'retiro' | 'envio',
    direccion_envio: '',
    nota: '',
    sena: 0,
    prioridad: false,
    fecha_entrega: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const [itemNombre, setItemNombre] = useState('')
  const [itemObservacion, setItemObservacion] = useState('')
  const [itemCantidad, setItemCantidad] = useState(1)
  const [itemPrecio, setItemPrecio] = useState(0)

  function addItem() {
    if (!itemNombre.trim()) return
    setCart((prev) => [
      ...prev,
      {
        nombre: itemNombre.trim(),
        observacion: itemObservacion.trim(),
        cantidad: itemCantidad,
        precio_unitario: itemPrecio,
      },
    ])
    setItemNombre('')
    setItemObservacion('')
    setItemCantidad(1)
    setItemPrecio(0)
  }

  const total = cart.reduce((s, i) => s + i.cantidad * i.precio_unitario, 0)

  function handleSubmit() {
    setError(null)
    if (!form.cliente_nombre.trim()) {
      setError('El nombre del cliente es obligatorio')
      return
    }
    if (cart.length === 0) {
      setError('Agregá al menos un producto')
      return
    }
    startTransition(async () => {
      const res = await createPedido({
        ...form,
        items: cart.map((i) => ({
          nombre_producto: i.nombre,
          observacion: i.observacion,
          cantidad: i.cantidad,
          precio_unitario: i.precio_unitario,
        })),
      })
      if (res?.error) {
        setError(typeof res.error === 'string' ? res.error : 'Error al crear el pedido')
      } else {
        setOpen(false)
        setCart([])
        resetForm()
      }
    })
  }

  function resetForm() {
    setForm({
      cliente_nombre: '',
      cliente_telefono: '',
      origen: 'whatsapp',
      entrega: 'retiro',
      direccion_envio: '',
      nota: '',
      sena: 0,
      prioridad: false,
      fecha_entrega: '',
    })
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 bg-foreground text-primary-foreground hover:bg-foreground/90 transition-colors rounded-lg px-4 py-2 text-sm font-medium"
      >
        <Plus size={16} />
        Nuevo pedido
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative bg-card rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-lg font-semibold">📥 Nuevo pedido</h2>
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
                    <label className="text-xs font-medium mb-1 block">Teléfono</label>
                    <input
                      value={form.cliente_telefono}
                      onChange={(e) => setForm({ ...form, cliente_telefono: e.target.value })}
                      className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="11 1234-5678 (opcional)"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block">Origen</label>
                    <select
                      value={form.origen}
                      onChange={(e) => setForm({ ...form, origen: e.target.value as any })}
                      className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="whatsapp">WhatsApp</option>
                      <option value="instagram">Instagram</option>
                      <option value="manual">Manual</option>
                    </select>
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
                  <div>
                    <label className="text-xs font-medium mb-1 block">Seña recibida</label>
                    <input
                      type="number"
                      min="0"
                      value={form.sena}
                      onChange={(e) => setForm({ ...form, sena: Number(e.target.value) })}
                      className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block">📅 Fecha de entrega</label>
                    <input
                      type="date"
                      value={form.fecha_entrega}
                      onChange={(e) => setForm({ ...form, fecha_entrega: e.target.value })}
                      className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div className="flex items-end pb-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.prioridad}
                        onChange={(e) => setForm({ ...form, prioridad: e.target.checked })}
                        className="w-4 h-4 rounded border-input accent-red-600"
                      />
                      <span className="text-xs font-medium">🔥 Marcar como urgente</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Agregar producto */}
              <div>
                <h3 className="text-sm font-semibold mb-3">📦 Agregar producto</h3>
                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-12">
                    <label className="text-xs font-medium mb-1 block">Nombre del producto</label>
                    <input
                      value={itemNombre}
                      onChange={(e) => setItemNombre(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addItem()}
                      className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="Ej: Llavero Toy Story - Woody"
                    />
                  </div>
                  <div className="col-span-12">
                    <label className="text-xs font-medium mb-1 block">Observación (color, tamaño, detalle...)</label>
                    <input
                      value={itemObservacion}
                      onChange={(e) => setItemObservacion(e.target.value)}
                      className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="Ej: rojo, talle M, sin logo..."
                    />
                  </div>
                  <div className="col-span-5">
                    <label className="text-xs font-medium mb-1 block">Precio unitario</label>
                    <input
                      type="number"
                      min="0"
                      value={itemPrecio || ''}
                      onChange={(e) => setItemPrecio(Number(e.target.value))}
                      className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="0"
                    />
                  </div>
                  <div className="col-span-4">
                    <label className="text-xs font-medium mb-1 block">Cantidad</label>
                    <input
                      type="number"
                      min="1"
                      value={itemCantidad}
                      onChange={(e) => setItemCantidad(Number(e.target.value))}
                      className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div className="col-span-3 flex flex-col justify-end">
                    <button
                      onClick={addItem}
                      disabled={!itemNombre.trim()}
                      className="w-full py-2 rounded-lg bg-foreground text-primary-foreground hover:bg-foreground/90 disabled:opacity-40 transition-colors flex items-center justify-center gap-1 text-sm"
                    >
                      <Plus size={14} />
                      Agregar
                    </button>
                  </div>
                  {itemNombre && itemPrecio > 0 && (
                    <div className="col-span-12 text-xs text-muted-foreground text-right">
                      Subtotal: {formatARS(itemCantidad * itemPrecio)}
                    </div>
                  )}
                </div>
              </div>

              {/* Lista de items */}
              {cart.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-2">Resumen del pedido</h3>
                  <div className="space-y-2">
                    {cart.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-start justify-between p-3 bg-secondary/30 rounded-lg text-sm gap-2"
                      >
                        <div className="min-w-0 flex-1">
                          <span className="font-medium">{item.nombre}</span>
                          {item.observacion && (
                            <span className="text-muted-foreground"> — {item.observacion}</span>
                          )}
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {formatARS(item.precio_unitario)} × {item.cantidad}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
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
                    <div className="flex justify-between pt-1 px-1">
                      <span className="text-sm text-muted-foreground">
                        {form.sena > 0 && `Seña: ${formatARS(form.sena)} · Pendiente: ${formatARS(Math.max(0, total - form.sena))}`}
                      </span>
                      <span className="text-base font-bold">Total: {formatARS(total)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

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
                {isPending ? 'Guardando...' : `Guardar pedido — ${formatARS(total)}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
