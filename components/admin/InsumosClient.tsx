'use client'

import { useState, useTransition, useRef, useCallback } from 'react'
import { Plus, Pencil, Trash2, Eye, EyeOff, Package, ShoppingBag, ChevronDown, ChevronUp, X, Loader2, ImageIcon } from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'
import type { Insumo, InsumoPedido } from '@/lib/actions/insumos'
import {
  getInsumos, getInsumoPedidos,
  createInsumo, updateInsumo, deleteInsumo,
  updateEstadoPedidoInsumo,
} from '@/lib/actions/insumos'

function fmtARS(n: number) { return `$${n.toLocaleString('es-AR')}` }
function fmtDate(s: string) {
  return new Date(s).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}

const UNIDADES = [
  { value: 'unidad', label: 'Unidad' },
  { value: 'kg', label: 'Kg' },
  { value: 'gramos', label: 'Gramos' },
] as const

function labelUnidad(u: string, stock: number) {
  if (u === 'unidad') return `${stock} u.`
  if (u === 'kg') return `${stock} kg`
  return `${stock} g`
}

// ── Formulario de insumo ──────────────────────────────────────────────────────

interface InsumoFormData {
  nombre: string
  descripcion: string
  categoria: string
  precio_unitario: string
  stock: string
  unidad: 'unidad' | 'kg' | 'gramos'
}

const EMPTY_FORM: InsumoFormData = {
  nombre: '', descripcion: '', categoria: 'General',
  precio_unitario: '', stock: '', unidad: 'unidad',
}

function insumoToForm(i: Insumo): InsumoFormData {
  return {
    nombre: i.nombre,
    descripcion: i.descripcion ?? '',
    categoria: i.categoria,
    precio_unitario: String(i.precio_unitario),
    stock: String(i.stock),
    unidad: i.unidad,
  }
}

// ── Slots de imagen ──────────────────────────────────────────────────────────

function ImageSlot({
  url, slot, insumoId, onUploaded, onRemoved,
}: {
  url: string | null
  slot: 1 | 2 | 3
  insumoId: string
  onUploaded: (slot: 1|2|3, url: string) => void
  onRemoved: (slot: 1|2|3) => void
}) {
  const [uploading, setUploading] = useState(false)
  const ref = useRef<HTMLInputElement>(null)

  async function compressImage(file: File): Promise<File> {
    return new Promise((resolve) => {
      const img = new Image()
      const objUrl = URL.createObjectURL(file)
      img.onload = () => {
        URL.revokeObjectURL(objUrl)
        let { width, height } = img
        if (width > 1200) { height = Math.round(height * 1200 / width); width = 1200 }
        const canvas = document.createElement('canvas')
        canvas.width = width; canvas.height = height
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
        canvas.toBlob(
          (blob) => resolve(blob ? new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' }) : file),
          'image/jpeg', 0.82
        )
      }
      img.src = objUrl
    })
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const compressed = await compressImage(file)
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      const path = `${insumoId}-${slot}.jpg`
      const { error: upErr } = await supabase.storage
        .from('insumos-fotos')
        .upload(path, compressed, { upsert: true, contentType: 'image/jpeg' })
      if (upErr) { alert('Error subiendo imagen: ' + upErr.message); return }
      const { data } = supabase.storage.from('insumos-fotos').getPublicUrl(path)
      const field = slot === 1 ? 'imagen_url' : slot === 2 ? 'imagen_url_2' : 'imagen_url_3'
      await updateInsumo(insumoId, { [field]: data.publicUrl })
      onUploaded(slot, data.publicUrl)
    } finally {
      setUploading(false)
      if (ref.current) ref.current.value = ''
    }
  }

  async function handleRemove() {
    const field = slot === 1 ? 'imagen_url' : slot === 2 ? 'imagen_url_2' : 'imagen_url_3'
    await updateInsumo(insumoId, { [field]: null })
    onRemoved(slot)
  }

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className="relative w-20 h-20 rounded-xl border-2 border-dashed border-border overflow-hidden bg-secondary/30 cursor-pointer hover:border-primary/50 transition-colors flex items-center justify-center group"
        onClick={() => !url && ref.current?.click()}
      >
        {url ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); ref.current?.click() }}
                className="p-1 rounded bg-white/20 hover:bg-white/40 text-white"
                title="Cambiar"
              >
                <Pencil size={12} />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleRemove() }}
                className="p-1 rounded bg-white/20 hover:bg-white/40 text-white"
                title="Quitar"
              >
                <X size={12} />
              </button>
            </div>
          </>
        ) : uploading ? (
          <Loader2 size={20} className="animate-spin text-muted-foreground" />
        ) : (
          <ImageIcon size={20} className="text-muted-foreground/50" />
        )}
      </div>
      <span className="text-[10px] text-muted-foreground">Foto {slot}</span>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  )
}

// ── Modal de insumo ───────────────────────────────────────────────────────────

function InsumoModal({
  insumo,
  onClose,
  onSaved,
}: {
  insumo: Insumo | null
  onClose: () => void
  onSaved: (i: Insumo) => void
}) {
  const [form, setForm] = useState<InsumoFormData>(insumo ? insumoToForm(insumo) : EMPTY_FORM)
  const [savedInsumo, setSavedInsumo] = useState<Insumo | null>(insumo)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function set(k: keyof InsumoFormData, v: string) { setForm(f => ({ ...f, [k]: v })) }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const precio = parseInt(form.precio_unitario)
    const stock = parseInt(form.stock)
    if (!form.nombre.trim()) return setError('El nombre es requerido')
    if (isNaN(precio) || precio <= 0) return setError('El precio debe ser mayor a 0')
    if (isNaN(stock) || stock < 0) return setError('El stock no puede ser negativo')
    setError('')

    startTransition(async () => {
      const payload = {
        nombre: form.nombre.trim(),
        descripcion: form.descripcion.trim() || null,
        categoria: form.categoria.trim() || 'General',
        precio_unitario: precio,
        stock,
        unidad: form.unidad,
      }
      if (savedInsumo) {
        const { error: err } = await updateInsumo(savedInsumo.id, payload)
        if (err) return setError(err)
        const updated = { ...savedInsumo, ...payload }
        setSavedInsumo(updated)
        onSaved(updated)
      } else {
        const { insumo: created, error: err } = await createInsumo(payload)
        if (err || !created) return setError(err ?? 'Error desconocido')
        setSavedInsumo(created)
        onSaved(created)
      }
    })
  }

  function handleImgUploaded(slot: 1|2|3, url: string) {
    if (!savedInsumo) return
    const field = slot === 1 ? 'imagen_url' : slot === 2 ? 'imagen_url_2' : 'imagen_url_3'
    const updated = { ...savedInsumo, [field]: url }
    setSavedInsumo(updated)
    onSaved(updated)
  }

  function handleImgRemoved(slot: 1|2|3) {
    if (!savedInsumo) return
    const field = slot === 1 ? 'imagen_url' : slot === 2 ? 'imagen_url_2' : 'imagen_url_3'
    const updated = { ...savedInsumo, [field]: null }
    setSavedInsumo(updated)
    onSaved(updated)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-background rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-bold text-base">{savedInsumo ? 'Editar insumo' : 'Nuevo insumo'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Nombre */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Nombre *</label>
            <input
              value={form.nombre}
              onChange={(e) => set('nombre', e.target.value)}
              placeholder="ej: Adhesivo 3M"
              className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          {/* Descripción */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Descripción</label>
            <textarea
              value={form.descripcion}
              onChange={(e) => set('descripcion', e.target.value)}
              placeholder="Descripción opcional..."
              rows={2}
              className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring resize-none"
            />
          </div>

          {/* Categoría */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Categoría</label>
            <input
              value={form.categoria}
              onChange={(e) => set('categoria', e.target.value)}
              placeholder="ej: Adhesivos, Herramientas..."
              className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          {/* Precio + Stock + Unidad */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Precio ($) *</label>
              <input
                type="number"
                min="1"
                value={form.precio_unitario}
                onChange={(e) => set('precio_unitario', e.target.value)}
                placeholder="0"
                className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Stock *</label>
              <input
                type="number"
                min="0"
                value={form.stock}
                onChange={(e) => set('stock', e.target.value)}
                placeholder="0"
                className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Unidad</label>
              <select
                value={form.unidad}
                onChange={(e) => set('unidad', e.target.value as 'unidad' | 'kg' | 'gramos')}
                className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {UNIDADES.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
              </select>
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={isPending}
            className="w-full py-2.5 rounded-xl bg-foreground text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isPending && <Loader2 size={14} className="animate-spin" />}
            {savedInsumo ? 'Guardar cambios' : 'Crear insumo'}
          </button>

          {/* Fotos — solo disponibles después de crear */}
          {savedInsumo && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Fotos</p>
              <div className="flex gap-3">
                {([1, 2, 3] as const).map(slot => (
                  <ImageSlot
                    key={slot}
                    slot={slot}
                    insumoId={savedInsumo.id}
                    url={slot === 1 ? savedInsumo.imagen_url : slot === 2 ? savedInsumo.imagen_url_2 : savedInsumo.imagen_url_3}
                    onUploaded={handleImgUploaded}
                    onRemoved={handleImgRemoved}
                  />
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1.5">Hacé click en el slot para subir o cambiar la foto</p>
            </div>
          )}
          {!savedInsumo && (
            <p className="text-[11px] text-muted-foreground text-center">
              Podés subir fotos después de crear el insumo
            </p>
          )}
        </form>
      </div>
    </div>
  )
}

// ── Fila de pedido ────────────────────────────────────────────────────────────

function PedidoRow({ pedido, onUpdated }: { pedido: InsumoPedido; onUpdated: (p: InsumoPedido) => void }) {
  const [open, setOpen] = useState(false)
  const [nota, setNota] = useState(pedido.nota ?? '')
  const [isPending, startTransition] = useTransition()
  const [err, setErr] = useState('')

  const estadoColors: Record<string, string> = {
    pendiente: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    confirmado: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    cancelado: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    entregado: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  }

  function cambiarEstado(estado: InsumoPedido['estado']) {
    setErr('')
    startTransition(async () => {
      const { error } = await updateEstadoPedidoInsumo(pedido.id, estado, nota || undefined)
      if (error) return setErr(error)
      onUpdated({ ...pedido, estado, nota: nota || null })
    })
  }

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/40 transition-colors text-left"
        onClick={() => setOpen(o => !o)}
      >
        <span className="text-sm font-bold text-muted-foreground w-10">#{pedido.numero}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{pedido.cliente_nombre}</p>
          <p className="text-xs text-muted-foreground">{fmtDate(pedido.created_at)}</p>
        </div>
        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${estadoColors[pedido.estado]}`}>
          {pedido.estado}
        </span>
        <span className="text-sm font-bold">{fmtARS(pedido.total)}</span>
        {open ? <ChevronUp size={14} className="text-muted-foreground shrink-0" /> : <ChevronDown size={14} className="text-muted-foreground shrink-0" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-border bg-secondary/10">
          {/* Items */}
          <div className="pt-3 space-y-1.5">
            {pedido.items.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span>{item.nombre} × {item.cantidad}</span>
                <span className="text-muted-foreground">{fmtARS(item.precio_unitario * item.cantidad)}</span>
              </div>
            ))}
            {pedido.descuento_pct > 0 && (
              <div className="flex items-center justify-between text-sm text-green-600 dark:text-green-400">
                <span>Descuento {pedido.descuento_pct}%</span>
                <span>-{fmtARS(Math.round(pedido.items.reduce((s, i) => s + i.precio_unitario * i.cantidad, 0) * pedido.descuento_pct / 100))}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-sm font-bold border-t border-border pt-1.5">
              <span>Total</span>
              <span>{fmtARS(pedido.total)}</span>
            </div>
          </div>

          {pedido.cliente_telefono && (
            <p className="text-xs text-muted-foreground">Tel: {pedido.cliente_telefono}</p>
          )}

          {/* Nota */}
          <textarea
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            placeholder="Nota interna..."
            rows={2}
            className="w-full border border-input rounded-lg px-3 py-2 text-xs bg-background focus:outline-none focus:ring-1 focus:ring-ring resize-none"
          />

          {err && <p className="text-xs text-red-500">{err}</p>}

          {/* Acciones */}
          <div className="flex flex-wrap gap-2">
            {pedido.estado === 'pendiente' && (
              <button
                onClick={() => cambiarEstado('confirmado')}
                disabled={isPending}
                className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 disabled:opacity-50"
              >
                Confirmar
              </button>
            )}
            {pedido.estado === 'confirmado' && (
              <button
                onClick={() => cambiarEstado('entregado')}
                disabled={isPending}
                className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-semibold hover:bg-green-700 disabled:opacity-50"
              >
                Marcar entregado
              </button>
            )}
            {(pedido.estado === 'pendiente' || pedido.estado === 'confirmado') && (
              <button
                onClick={() => cambiarEstado('cancelado')}
                disabled={isPending}
                className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 border border-red-200 text-xs font-semibold hover:bg-red-100 disabled:opacity-50 dark:bg-red-900/20 dark:border-red-700 dark:text-red-400"
              >
                Cancelar
              </button>
            )}
            {pedido.estado === 'cancelado' && (
              <button
                onClick={() => cambiarEstado('pendiente')}
                disabled={isPending}
                className="px-3 py-1.5 rounded-lg bg-secondary text-foreground text-xs font-semibold hover:bg-secondary/80 disabled:opacity-50"
              >
                Reactivar
              </button>
            )}
            {isPending && <Loader2 size={14} className="animate-spin text-muted-foreground self-center" />}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

type Tab = 'catalogo' | 'pedidos'

export default function InsumosClient({
  initialInsumos,
  initialPedidos,
}: {
  initialInsumos: Insumo[]
  initialPedidos: InsumoPedido[]
}) {
  const [tab, setTab] = useState<Tab>('catalogo')
  const [insumos, setInsumos] = useState(initialInsumos)
  const [pedidos, setPedidos] = useState(initialPedidos)
  const [modal, setModal] = useState<{ open: true; insumo: Insumo | null } | null>(null)
  const [pedidoSubtab, setPedidoSubtab] = useState<InsumoPedido['estado']>('pendiente')
  const [isPending, startTransition] = useTransition()
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const refreshInsumos = useCallback(() => {
    startTransition(async () => {
      const data = await getInsumos()
      setInsumos(data)
    })
  }, [])

  const refreshPedidos = useCallback(() => {
    startTransition(async () => {
      const data = await getInsumoPedidos()
      setPedidos(data)
    })
  }, [])

  function handleSaved(i: Insumo) {
    setInsumos(prev => {
      const idx = prev.findIndex(x => x.id === i.id)
      if (idx >= 0) { const next = [...prev]; next[idx] = i; return next }
      return [i, ...prev]
    })
  }

  async function handleToggleActivo(insumo: Insumo) {
    await updateInsumo(insumo.id, { activo: !insumo.activo })
    setInsumos(prev => prev.map(i => i.id === insumo.id ? { ...i, activo: !i.activo } : i))
  }

  async function handleDelete(id: string) {
    const { error } = await deleteInsumo(id)
    if (error) { alert(error); return }
    setInsumos(prev => prev.filter(i => i.id !== id))
    setDeleteConfirm(null)
  }

  const pedidosFiltrados = pedidos.filter(p => p.estado === pedidoSubtab)
  const pendientesCount = pedidos.filter(p => p.estado === 'pendiente').length

  return (
    <div className="space-y-5">
      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-secondary rounded-xl w-fit">
        {([
          { key: 'catalogo', icon: Package, label: 'Catálogo' },
          { key: 'pedidos', icon: ShoppingBag, label: `Pedidos${pendientesCount > 0 ? ` (${pendientesCount})` : ''}` },
        ] as const).map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            onClick={() => { setTab(key); if (key === 'pedidos') refreshPedidos() }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === key ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* ── Tab Catálogo ── */}
      {tab === 'catalogo' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{insumos.length} insumo{insumos.length !== 1 ? 's' : ''}</p>
            <div className="flex gap-2">
              <button
                onClick={refreshInsumos}
                disabled={isPending}
                className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-secondary disabled:opacity-50"
              >
                Actualizar
              </button>
              <button
                onClick={() => setModal({ open: true, insumo: null })}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-foreground text-primary-foreground text-xs font-semibold hover:opacity-90"
              >
                <Plus size={13} />
                Nuevo insumo
              </button>
            </div>
          </div>

          {insumos.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Package size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">No hay insumos cargados</p>
              <p className="text-sm mt-1">Creá el primero con el botón de arriba</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {insumos.map(insumo => (
                <div
                  key={insumo.id}
                  className={`border border-border rounded-xl overflow-hidden ${!insumo.activo ? 'opacity-50' : ''}`}
                >
                  {/* Imagen principal */}
                  <div className="relative h-32 bg-secondary/30 flex items-center justify-center">
                    {insumo.imagen_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={insumo.imagen_url} alt={insumo.nombre} className="w-full h-full object-cover" />
                    ) : (
                      <Package size={32} className="text-muted-foreground/30" />
                    )}
                    {/* Fotos extra */}
                    {(insumo.imagen_url_2 || insumo.imagen_url_3) && (
                      <div className="absolute bottom-1.5 right-1.5 flex gap-1">
                        {insumo.imagen_url_2 && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={insumo.imagen_url_2} alt="" className="w-8 h-8 rounded object-cover border-2 border-background" />
                        )}
                        {insumo.imagen_url_3 && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={insumo.imagen_url_3} alt="" className="w-8 h-8 rounded object-cover border-2 border-background" />
                        )}
                      </div>
                    )}
                  </div>

                  <div className="p-3 space-y-2">
                    <div>
                      <p className="font-semibold text-sm truncate">{insumo.nombre}</p>
                      <p className="text-[11px] text-muted-foreground">{insumo.categoria}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-base">{fmtARS(insumo.precio_unitario)}</span>
                      <span className="text-xs text-muted-foreground">{labelUnidad(insumo.unidad, insumo.stock)}</span>
                    </div>

                    {/* Acciones */}
                    <div className="flex gap-1.5 pt-1">
                      <button
                        onClick={() => setModal({ open: true, insumo })}
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-secondary"
                      >
                        <Pencil size={12} />
                        Editar
                      </button>
                      <button
                        onClick={() => handleToggleActivo(insumo)}
                        className="p-1.5 rounded-lg border border-border hover:bg-secondary text-muted-foreground"
                        title={insumo.activo ? 'Ocultar' : 'Mostrar'}
                      >
                        {insumo.activo ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                      {deleteConfirm === insumo.id ? (
                        <>
                          <button
                            onClick={() => handleDelete(insumo.id)}
                            className="px-2 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700"
                          >
                            Confirmar
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="px-2 py-1.5 rounded-lg border border-border text-xs hover:bg-secondary"
                          >
                            No
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(insumo.id)}
                          className="p-1.5 rounded-lg border border-border hover:bg-red-50 hover:border-red-200 text-muted-foreground hover:text-red-600 dark:hover:bg-red-900/20"
                          title="Eliminar"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tab Pedidos ── */}
      {tab === 'pedidos' && (
        <div className="space-y-4">
          {/* Subtabs */}
          <div className="flex gap-1 flex-wrap">
            {(['pendiente', 'confirmado', 'entregado', 'cancelado'] as const).map(st => {
              const count = pedidos.filter(p => p.estado === st).length
              const colors: Record<string, string> = {
                pendiente: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-700',
                confirmado: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700',
                entregado: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-700',
                cancelado: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-700',
              }
              return (
                <button
                  key={st}
                  onClick={() => setPedidoSubtab(st)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-semibold capitalize transition-colors ${
                    pedidoSubtab === st ? colors[st] : 'bg-background border-border text-muted-foreground hover:bg-secondary'
                  }`}
                >
                  {st} {count > 0 && `(${count})`}
                </button>
              )
            })}
          </div>

          {pedidosFiltrados.length === 0 ? (
            <p className="text-center py-10 text-sm text-muted-foreground">No hay pedidos {pedidoSubtab}s</p>
          ) : (
            <div className="space-y-2">
              {pedidosFiltrados.map(p => (
                <PedidoRow
                  key={p.id}
                  pedido={p}
                  onUpdated={(updated) => setPedidos(prev => prev.map(x => x.id === updated.id ? updated : x))}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {modal?.open && (
        <InsumoModal
          insumo={modal.insumo}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
