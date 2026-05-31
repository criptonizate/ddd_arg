'use client'

import { useState, useTransition } from 'react'
import {
  createVariant,
  updateVariant,
  deleteVariant,
  adjustStock,
} from '@/lib/actions/products'
import { formatARS } from '@/lib/utils'
import type { ProductVariant } from '@/lib/supabase/types'
import { Plus, Pencil, Trash2, AlertTriangle, Check, X } from 'lucide-react'

interface Props {
  productId: string
  variants: ProductVariant[]
}

const EMPTY: Omit<ProductVariant, 'id' | 'product_id' | 'created_at'> = {
  nombre_variante: '',
  color: '',
  tamaño: '',
  precio: null,
  stock: 0,
  stock_minimo: 3,
}

export default function VariantManager({ productId, variants }: Props) {
  const [editing, setEditing] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [stockInput, setStockInput] = useState<Record<string, number>>({})
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function openAdd() {
    setForm(EMPTY)
    setEditing(null)
    setAdding(true)
  }

  function openEdit(v: ProductVariant) {
    setForm({
      nombre_variante: v.nombre_variante,
      color: v.color ?? '',
      tamaño: v.tamaño ?? '',
      precio: v.precio,
      stock: v.stock,
      stock_minimo: v.stock_minimo,
    })
    setEditing(v.id)
    setAdding(false)
  }

  function cancel() {
    setAdding(false)
    setEditing(null)
    setError(null)
  }

  async function handleSubmit() {
    setError(null)
    const data = {
      ...form,
      color: form.color ?? '',
      tamaño: form.tamaño ?? '',
      precio: form.precio === null || form.precio === 0 ? null : Number(form.precio),
      stock: Number(form.stock),
      stock_minimo: Number(form.stock_minimo),
    }

    startTransition(async () => {
      const res = editing
        ? await updateVariant(editing, productId, data)
        : await createVariant(productId, data)

      if (res?.error) {
        setError(typeof res.error === 'string' ? res.error : JSON.stringify(res.error))
      } else {
        cancel()
      }
    })
  }

  async function handleDelete(variantId: string) {
    if (!confirm('¿Eliminar esta variante?')) return
    startTransition(async () => {
      await deleteVariant(variantId, productId)
    })
  }

  async function handleStockAdjust(variantId: string) {
    const newStock = stockInput[variantId]
    if (newStock === undefined) return
    startTransition(async () => {
      const res = await adjustStock(variantId, productId, newStock)
      if (res?.error) setError(res.error)
      else setStockInput((prev) => ({ ...prev, [variantId]: NaN }))
    })
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {variants.length === 0 && !adding && (
        <p className="text-sm text-muted-foreground">
          Sin variantes. Agregá al menos una para controlar el stock.
        </p>
      )}

      {/* Lista de variantes */}
      <div className="space-y-2">
        {variants.map((v) => (
          <div
            key={v.id}
            className={`border rounded-xl p-4 ${
              v.stock <= v.stock_minimo
                ? 'border-orange-200 bg-orange-50'
                : 'border-border bg-card'
            }`}
          >
            {editing === v.id ? (
              <VariantForm
                form={form}
                setForm={setForm}
                onSubmit={handleSubmit}
                onCancel={cancel}
                pending={isPending}
              />
            ) : (
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{v.nombre_variante}</span>
                    {v.stock <= v.stock_minimo && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-xs font-medium border border-orange-200">
                        <AlertTriangle size={10} />
                        Stock bajo
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
                    {v.color && <span>Color: {v.color}</span>}
                    {v.tamaño && <span>Tamaño: {v.tamaño}</span>}
                    {v.precio && <span>Precio: {formatARS(v.precio)}</span>}
                    <span>Mín. stock: {v.stock_minimo}</span>
                  </div>
                </div>

                {/* Stock adjustment */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold w-8 text-center">{v.stock}</span>
                    <input
                      type="number"
                      min="0"
                      placeholder="nuevo"
                      value={isNaN(stockInput[v.id] as number) ? '' : stockInput[v.id] ?? ''}
                      onChange={(e) =>
                        setStockInput((prev) => ({
                          ...prev,
                          [v.id]: parseInt(e.target.value) || 0,
                        }))
                      }
                      className="w-20 border border-input rounded-lg px-2 py-1 text-xs bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                    <button
                      onClick={() => handleStockAdjust(v.id)}
                      disabled={isPending}
                      className="p-1.5 rounded-lg bg-foreground text-primary-foreground hover:bg-foreground/90 disabled:opacity-50 transition-colors"
                      title="Ajustar stock"
                    >
                      <Check size={12} />
                    </button>
                  </div>

                  <button
                    onClick={() => openEdit(v)}
                    className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
                    title="Editar"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(v.id)}
                    disabled={isPending}
                    className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Formulario agregar */}
      {adding && (
        <div className="border border-border rounded-xl p-4 bg-secondary/20">
          <p className="text-sm font-medium mb-3">Nueva variante</p>
          <VariantForm
            form={form}
            setForm={setForm}
            onSubmit={handleSubmit}
            onCancel={cancel}
            pending={isPending}
          />
        </div>
      )}

      {!adding && editing === null && (
        <button
          onClick={openAdd}
          className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground border border-dashed border-border hover:border-foreground rounded-xl px-4 py-3 w-full justify-center transition-colors"
        >
          <Plus size={16} />
          Agregar variante
        </button>
      )}
    </div>
  )
}

function VariantForm({
  form,
  setForm,
  onSubmit,
  onCancel,
  pending,
}: {
  form: typeof EMPTY
  setForm: (f: typeof EMPTY) => void
  onSubmit: () => void
  onCancel: () => void
  pending: boolean
}) {
  function set(key: keyof typeof EMPTY, value: string | number | null) {
    setForm({ ...form, [key]: value })
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <label className="text-xs font-medium mb-1 block">
            Nombre variante <span className="text-destructive">*</span>
          </label>
          <input
            value={form.nombre_variante}
            onChange={(e) => set('nombre_variante', e.target.value)}
            placeholder="Ej: Rojo / Grande"
            className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div>
          <label className="text-xs font-medium mb-1 block">Color</label>
          <input
            value={form.color ?? ''}
            onChange={(e) => set('color', e.target.value)}
            placeholder="Rojo"
            className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div>
          <label className="text-xs font-medium mb-1 block">Tamaño</label>
          <input
            value={form.tamaño ?? ''}
            onChange={(e) => set('tamaño', e.target.value)}
            placeholder="Grande"
            className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div>
          <label className="text-xs font-medium mb-1 block">Precio propio (ARS)</label>
          <input
            type="number"
            min="0"
            value={form.precio ?? ''}
            onChange={(e) =>
              set('precio', e.target.value === '' ? null : Number(e.target.value))
            }
            placeholder="Dejar vacío para usar precio base"
            className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div>
          <label className="text-xs font-medium mb-1 block">
            Stock <span className="text-destructive">*</span>
          </label>
          <input
            type="number"
            min="0"
            value={form.stock}
            onChange={(e) => set('stock', Number(e.target.value))}
            className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div>
          <label className="text-xs font-medium mb-1 block">Stock mínimo (alerta)</label>
          <input
            type="number"
            min="0"
            value={form.stock_minimo}
            onChange={(e) => set('stock_minimo', Number(e.target.value))}
            className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border border-border hover:bg-secondary transition-colors"
        >
          <X size={14} />
          Cancelar
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={pending}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-foreground text-primary-foreground hover:bg-foreground/90 disabled:opacity-60 transition-colors"
        >
          <Check size={14} />
          {pending ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </div>
  )
}
