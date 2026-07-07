'use client'

import { useState, useTransition } from 'react'
import { createNegocioPedido } from '@/lib/actions/negocios'
import { Plus, X, Trash2 } from 'lucide-react'
import { formatARS } from '@/lib/utils'

interface Item {
  nombre_producto: string
  precio_mayorista: number
  cantidad: number
}

interface ProductoHistorial {
  nombre: string
  precio: number
}

export default function NuevoPedidoNegocioButton({
  negocioId,
  negocioNombre,
  historialProductos = [],
}: {
  negocioId: string
  negocioNombre: string
  historialProductos?: ProductoHistorial[]
}) {
  const [open, setOpen] = useState(false)
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [nota, setNota] = useState('')
  const [items, setItems] = useState<Item[]>([])
  const [itemNombre, setItemNombre] = useState('')
  const [itemPrecio, setItemPrecio] = useState(0)
  const [itemCantidad, setItemCantidad] = useState(1)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const total = items.reduce((s, i) => s + i.precio_mayorista * i.cantidad, 0)

  const sugerencias = historialProductos.filter(
    (p) => itemNombre.length > 0 && p.nombre.toLowerCase().includes(itemNombre.toLowerCase())
  )

  function selectSugerencia(s: ProductoHistorial) {
    setItemNombre(s.nombre)
    setItemPrecio(s.precio)
    setShowSuggestions(false)
  }

  function addItem() {
    if (!itemNombre.trim()) return
    setItems((prev) => [
      ...prev,
      { nombre_producto: itemNombre.trim(), precio_mayorista: itemPrecio, cantidad: itemCantidad },
    ])
    setItemNombre('')
    setItemPrecio(0)
    setItemCantidad(1)
    setShowSuggestions(false)
  }

  function handleClose() {
    setOpen(false)
    setItems([])
    setNota('')
    setFecha(new Date().toISOString().split('T')[0])
    setError(null)
    setItemNombre('')
    setItemPrecio(0)
    setItemCantidad(1)
  }

  function handleSubmit() {
    setError(null)
    if (items.length === 0) { setError('Agregá al menos un producto'); return }
    startTransition(async () => {
      const res = await createNegocioPedido({
        negocio_id: negocioId,
        fecha,
        nota,
        items,
      })
      if (res?.error) { setError(res.error); return }
      handleClose()
    })
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-border hover:bg-secondary hover:border-foreground/30 transition-colors"
      >
        <Plus size={13} /> Nuevo pedido
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={handleClose} />
          <div className="relative bg-card rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div>
                <h2 className="text-lg font-semibold">📦 Nuevo pedido</h2>
                <p className="text-xs text-muted-foreground mt-0.5">{negocioNombre}</p>
              </div>
              <button onClick={handleClose} className="p-1.5 rounded-lg hover:bg-secondary">
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {error && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              {/* Fecha y nota */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium mb-1 block">📅 Fecha *</label>
                  <input
                    type="date"
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">Nota (opcional)</label>
                  <input
                    value={nota}
                    onChange={(e) => setNota(e.target.value)}
                    className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Observaciones..."
                  />
                </div>
              </div>

              {/* Agregar producto */}
              <div>
                <h3 className="text-sm font-semibold mb-3">Agregar producto</h3>
                <div className="space-y-2">
                  {/* Input nombre con sugerencias */}
                  <div className="relative">
                    <input
                      value={itemNombre}
                      onChange={(e) => {
                        setItemNombre(e.target.value)
                        setShowSuggestions(true)
                      }}
                      onFocus={() => setShowSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                      className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="Nombre del producto (ej: Llavero Woody)"
                      onKeyDown={(e) => e.key === 'Enter' && addItem()}
                      autoComplete="off"
                    />
                    {showSuggestions && sugerencias.length > 0 && (
                      <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-card border border-border rounded-xl shadow-lg overflow-hidden max-h-52 overflow-y-auto">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide px-3 py-1.5 border-b border-border/60">
                          Productos anteriores
                        </p>
                        {sugerencias.map((s) => (
                          <button
                            key={s.nombre}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault()
                              selectSugerencia(s)
                            }}
                            className="w-full flex items-center justify-between px-3 py-2.5 text-sm hover:bg-secondary transition-colors text-left gap-3"
                          >
                            <span className="font-medium truncate">{s.nombre}</span>
                            <span className="text-xs text-muted-foreground shrink-0">
                              {s.precio > 0 ? formatARS(s.precio) : 'sin precio'}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Precio y cantidad */}
                  <div className="grid grid-cols-12 gap-2">
                    <div className="col-span-5">
                      <input
                        type="number"
                        min="0"
                        value={itemPrecio || ''}
                        onChange={(e) => setItemPrecio(Number(e.target.value))}
                        className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                        placeholder="Precio mayorista"
                      />
                    </div>
                    <div className="col-span-4">
                      <input
                        type="number"
                        min="1"
                        value={itemCantidad}
                        onChange={(e) => setItemCantidad(Number(e.target.value))}
                        className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                        placeholder="Cantidad"
                      />
                    </div>
                    <div className="col-span-3 flex items-stretch">
                      <button
                        onClick={addItem}
                        disabled={!itemNombre.trim()}
                        className="w-full py-2 rounded-lg bg-foreground text-primary-foreground hover:bg-foreground/90 disabled:opacity-40 flex items-center justify-center gap-1 text-sm"
                      >
                        <Plus size={14} /> Agregar
                      </button>
                    </div>
                    {itemNombre && itemPrecio > 0 && (
                      <div className="col-span-12 text-xs text-muted-foreground text-right">
                        Subtotal: {formatARS(itemCantidad * itemPrecio)}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Lista de items */}
              {items.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-2">Productos en este pedido</h3>
                  <div className="space-y-2">
                    {items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-2 p-3 bg-secondary/30 rounded-lg text-sm">
                        <div className="min-w-0 flex-1">
                          <span className="font-medium">{item.nombre_producto}</span>
                          <span className="text-muted-foreground text-xs ml-2">
                            {formatARS(item.precio_mayorista)} × {item.cantidad}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-semibold">{formatARS(item.precio_mayorista * item.cantidad)}</span>
                          <button
                            onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
                            className="p-1 rounded hover:bg-secondary"
                          >
                            <Trash2 size={12} className="text-muted-foreground" />
                          </button>
                        </div>
                      </div>
                    ))}
                    <div className="flex justify-end pt-1 px-1">
                      <span className="text-base font-bold">Total: {formatARS(total)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-border">
              <button
                onClick={handleClose}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-border hover:bg-secondary transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={isPending || items.length === 0}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-foreground text-primary-foreground hover:bg-foreground/90 disabled:opacity-60 transition-colors"
              >
                {isPending ? 'Guardando...' : `Guardar pedido${total > 0 ? ` — ${formatARS(total)}` : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
