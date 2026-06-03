'use client'

import { useState, useTransition } from 'react'
import { updateOrderItems } from '@/lib/actions/orders'
import { useToast } from './ToastProvider'
import { formatARS } from '@/lib/utils'
import { Pencil, X, Trash2, Plus } from 'lucide-react'

interface Row {
  nombre_producto: string
  nombre_variante: string
  cantidad: number
  precio_unitario: number
}

interface Props {
  orderId: string
  items: {
    nombre_producto: string
    nombre_variante?: string | null
    cantidad: number
    precio_unitario: number
  }[]
}

export default function EditOrderItemsButton({ orderId, items }: Props) {
  const [open, setOpen] = useState(false)
  const [rows, setRows] = useState<Row[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()

  function openModal() {
    setRows(
      items.map((i) => ({
        nombre_producto: i.nombre_producto,
        nombre_variante: i.nombre_variante ?? '',
        cantidad: i.cantidad,
        precio_unitario: i.precio_unitario,
      }))
    )
    setError(null)
    setOpen(true)
  }

  function closeModal() {
    setOpen(false)
    setRows([])
    setError(null)
  }

  function updateRow(idx: number, field: keyof Row, value: string | number) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)))
  }

  function removeRow(idx: number) {
    setRows((prev) => prev.filter((_, i) => i !== idx))
  }

  function addRow() {
    setRows((prev) => [...prev, { nombre_producto: '', nombre_variante: '', cantidad: 1, precio_unitario: 0 }])
  }

  const total = rows.reduce((s, r) => s + r.cantidad * r.precio_unitario, 0)

  function handleSave() {
    setError(null)
    const valid = rows.filter((r) => r.nombre_producto.trim())
    if (!valid.length) { setError('Debe tener al menos un producto'); return }
    for (const r of valid) {
      if (r.cantidad <= 0) { setError('La cantidad debe ser mayor a 0'); return }
      if (r.precio_unitario < 0) { setError('El precio no puede ser negativo'); return }
    }
    startTransition(async () => {
      const res = await updateOrderItems(
        orderId,
        valid.map((r) => ({
          nombre_producto: r.nombre_producto.trim(),
          nombre_variante: r.nombre_variante.trim() || null,
          cantidad: r.cantidad,
          precio_unitario: r.precio_unitario,
        }))
      )
      if (res?.error) {
        setError(res.error)
      } else {
        toast('Productos actualizados ✓')
        closeModal()
      }
    })
  }

  return (
    <>
      <button
        onClick={openModal}
        className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        title="Editar productos"
      >
        <Pencil size={11} /> Editar
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={closeModal} />
          <div className="relative bg-card rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="text-base font-semibold">Editar productos del pedido</h2>
              <button onClick={closeModal} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
                <X size={15} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {error && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              {/* Encabezado de columnas */}
              <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground px-1">
                <div className="col-span-4">Producto</div>
                <div className="col-span-3">Variante (opc.)</div>
                <div className="col-span-2 text-center">Cant.</div>
                <div className="col-span-2">Precio $</div>
                <div className="col-span-1" />
              </div>

              {/* Filas editables */}
              <div className="space-y-2">
                {rows.map((row, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-4">
                      <input
                        value={row.nombre_producto}
                        onChange={(e) => updateRow(idx, 'nombre_producto', e.target.value)}
                        placeholder="Nombre del producto"
                        className="w-full border border-input rounded-lg px-2.5 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    <div className="col-span-3">
                      <input
                        value={row.nombre_variante}
                        onChange={(e) => updateRow(idx, 'nombre_variante', e.target.value)}
                        placeholder="Ej: Fucsia"
                        className="w-full border border-input rounded-lg px-2.5 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        min="1"
                        value={row.cantidad}
                        onChange={(e) => updateRow(idx, 'cantidad', Math.max(1, Number(e.target.value)))}
                        className="w-full border border-input rounded-lg px-2.5 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring text-center"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={row.precio_unitario || ''}
                        onChange={(e) => updateRow(idx, 'precio_unitario', Number(e.target.value))}
                        placeholder="0"
                        className="w-full border border-input rounded-lg px-2.5 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    <div className="col-span-1 flex justify-center">
                      <button
                        onClick={() => removeRow(idx)}
                        disabled={rows.length === 1}
                        className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-30"
                        title="Eliminar fila"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Agregar fila */}
              <button
                onClick={addRow}
                className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <Plus size={13} /> Agregar ítem
              </button>

              {/* Resumen */}
              {rows.some((r) => r.nombre_producto.trim()) && (
                <div className="border-t border-border pt-3 space-y-1">
                  {rows
                    .filter((r) => r.nombre_producto.trim())
                    .map((row, idx) => (
                      <div key={idx} className="flex justify-between text-xs text-muted-foreground">
                        <span>
                          {row.nombre_producto}
                          {row.nombre_variante ? ` — ${row.nombre_variante}` : ''}
                          {' × '}{row.cantidad}
                        </span>
                        <span className="font-medium tabular-nums">
                          {formatARS(row.cantidad * row.precio_unitario)}
                        </span>
                      </div>
                    ))}
                  <div className="flex justify-between pt-1.5 text-sm font-bold border-t border-border/50">
                    <span>Total</span>
                    <span className="tabular-nums">{formatARS(total)}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 p-5 border-t border-border">
              <button
                onClick={closeModal}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-border hover:bg-secondary transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={isPending}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-foreground text-primary-foreground hover:bg-foreground/90 disabled:opacity-60 transition-colors"
              >
                {isPending ? 'Guardando...' : `Guardar — ${formatARS(total)}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
