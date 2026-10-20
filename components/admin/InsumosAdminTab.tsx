'use client'

import { useState, useEffect, useTransition } from 'react'
import { Plus, Trash2, Pencil, Package, Clock, CheckCircle2, Truck, XCircle, ChevronDown, ChevronUp } from 'lucide-react'
import {
  getInsumos, createInsumo, updateInsumo, deleteInsumo,
  getInsumoPedidos, updateEstadoPedidoInsumo,
  type Insumo, type InsumoPedido, type InsumoPedidoItem,
} from '@/lib/actions/insumos'

function fmtARS(n: number) { return `$${n.toLocaleString('es-AR')}` }
function fmtFecha(d: string) {
  return new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}

const ESTADO_CONFIG = {
  pendiente:  { label: 'Pendiente',  icon: Clock,        cls: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' },
  confirmado: { label: 'Confirmado', icon: CheckCircle2, cls: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
  entregado:  { label: 'Entregado',  icon: Truck,        cls: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
  cancelado:  { label: 'Cancelado',  icon: XCircle,      cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
} as const

// ── Sección pedidos ──────────────────────────────────────────────────────────

function PedidosInsumos() {
  const [pedidos, setPedidos] = useState<InsumoPedido[]>([])
  const [loading, setLoading] = useState(true)
  const [subtab, setSubtab] = useState<'pendiente' | 'confirmado' | 'cancelado'>('pendiente')
  const [expandido, setExpandido] = useState<string | null>(null)
  const [procesando, setProcesando] = useState<string | null>(null)
  const [notaModal, setNotaModal] = useState<{ id: string; accion: 'confirmar' | 'cancelar' } | null>(null)
  const [notaTexto, setNotaTexto] = useState('')
  const [error, setError] = useState('')
  const [, startTransition] = useTransition()

  useEffect(() => {
    getInsumoPedidos().then(data => { setPedidos(data); setLoading(false) })
  }, [])

  const lista = pedidos.filter(p => p.estado === subtab)

  function ejecutarAccion() {
    if (!notaModal) return
    const { id, accion } = notaModal
    setNotaModal(null)
    setProcesando(id)
    setError('')
    startTransition(async () => {
      const nuevoEstado = accion === 'confirmar' ? 'confirmado' : 'cancelado'
      const result = await updateEstadoPedidoInsumo(id, nuevoEstado, notaTexto || undefined)
      if (result.error) { setError(result.error); setProcesando(null); return }
      setPedidos(prev => prev.map(p => p.id === id ? { ...p, estado: nuevoEstado, nota: notaTexto || p.nota } : p))
      setProcesando(null)
      setSubtab(nuevoEstado as 'confirmado' | 'cancelado')
    })
  }

  function marcarEntregado(id: string) {
    setProcesando(id)
    startTransition(async () => {
      await updateEstadoPedidoInsumo(id, 'entregado')
      setPedidos(prev => prev.filter(p => p.id !== id))
      setProcesando(null)
    })
  }

  const pendienteCount = pedidos.filter(p => p.estado === 'pendiente').length

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2">{error}</p>}
      <div className="flex gap-2 flex-wrap">
        {(['pendiente', 'confirmado', 'cancelado'] as const).map(s => {
          const count = pedidos.filter(p => p.estado === s).length
          return (
            <button key={s} onClick={() => setSubtab(s)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                subtab === s
                  ? s === 'pendiente' ? 'bg-yellow-500 text-white border-yellow-500'
                    : s === 'confirmado' ? 'bg-green-600 text-white border-green-600'
                    : 'bg-red-500 text-white border-red-500'
                  : 'border-border text-muted-foreground hover:text-foreground'
              }`}>
              {s.charAt(0).toUpperCase() + s.slice(1)} {count > 0 && `(${count})`}
            </button>
          )
        })}
      </div>

      {loading && <p className="text-sm text-muted-foreground">Cargando...</p>}

      {!loading && lista.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">Sin pedidos {subtab === 'pendiente' ? 'pendientes' : subtab === 'confirmado' ? 'confirmados' : 'cancelados'}</p>
      )}

      <div className="space-y-3">
        {lista.map(p => {
          const cfg = ESTADO_CONFIG[p.estado] ?? ESTADO_CONFIG.pendiente
          const Icon = cfg.icon
          const isExpanded = expandido === p.id
          return (
            <div key={p.id} className="bg-card border border-border rounded-xl overflow-hidden">
              <div
                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-secondary/30 transition-colors"
                onClick={() => setExpandido(isExpanded ? null : p.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm">N° {p.numero}</span>
                    <span className="text-xs text-muted-foreground">{p.cliente_nombre}</span>
                    {p.cliente_telefono && <span className="text-xs text-muted-foreground">· {p.cliente_telefono}</span>}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${cfg.cls}`}>
                      <Icon size={9} /> {cfg.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{fmtFecha(p.created_at)}</span>
                    {p.descuento_pct > 0 && (
                      <span className="text-[10px] font-semibold" style={{ color: '#22c55e' }}>−{p.descuento_pct}% mayorista</span>
                    )}
                  </div>
                </div>
                <span className="font-black text-sm shrink-0">{fmtARS(p.total)}</span>
                {isExpanded ? <ChevronUp size={14} className="shrink-0 text-muted-foreground" /> : <ChevronDown size={14} className="shrink-0 text-muted-foreground" />}
              </div>

              {isExpanded && (
                <div className="border-t border-border px-4 py-3 space-y-3">
                  <div className="space-y-1">
                    {(p.items as InsumoPedidoItem[]).map((item, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span>{item.cantidad}x {item.nombre}</span>
                        <span className="text-muted-foreground font-mono text-xs">{fmtARS(item.cantidad * item.precio_unitario)}</span>
                      </div>
                    ))}
                    {p.descuento_pct > 0 && (
                      <div className="flex justify-between text-xs font-semibold pt-1 border-t border-border" style={{ color: '#22c55e' }}>
                        <span>Descuento mayorista −{p.descuento_pct}%</span>
                        <span>−{fmtARS(p.items.reduce((s, i) => s + i.cantidad * i.precio_unitario, 0) - p.total)}</span>
                      </div>
                    )}
                  </div>
                  {p.nota && <p className="text-xs text-muted-foreground bg-secondary/20 rounded-lg px-3 py-2">💬 {p.nota}</p>}

                  {p.estado === 'pendiente' && (
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => { setNotaModal({ id: p.id, accion: 'confirmar' }); setNotaTexto('') }}
                        disabled={procesando === p.id}
                        className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50"
                      >
                        <CheckCircle2 size={12} /> Confirmar
                      </button>
                      <button
                        onClick={() => { setNotaModal({ id: p.id, accion: 'cancelar' }); setNotaTexto('') }}
                        disabled={procesando === p.id}
                        className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50"
                      >
                        <XCircle size={12} /> Cancelar
                      </button>
                    </div>
                  )}
                  {p.estado === 'confirmado' && (
                    <button
                      onClick={() => marcarEntregado(p.id)}
                      disabled={procesando === p.id}
                      className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      <Truck size={12} /> Marcar entregado
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Modal de nota */}
      {notaModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-background border border-border rounded-2xl p-5 space-y-4">
            <p className="font-bold">{notaModal.accion === 'confirmar' ? 'Confirmar pedido' : 'Cancelar pedido'}</p>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Nota para el cliente (opcional)</label>
              <textarea
                value={notaTexto}
                onChange={e => setNotaTexto(e.target.value)}
                rows={3}
                className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={ejecutarAccion}
                className={`flex-1 py-2 rounded-xl text-sm font-bold text-white transition-colors ${notaModal.accion === 'confirmar' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-500 hover:bg-red-600'}`}
              >
                {notaModal.accion === 'confirmar' ? 'Confirmar' : 'Cancelar pedido'}
              </button>
              <button onClick={() => setNotaModal(null)} className="flex-1 py-2 rounded-xl text-sm font-medium border border-border hover:bg-secondary">
                Volver
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Sección catálogo ─────────────────────────────────────────────────────────

function CatalogoInsumos() {
  const [insumos, setInsumos] = useState<Insumo[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ nombre: '', descripcion: '', categoria: 'General', precio_unitario: '', stock: '', imagen_url: '' })
  const [error, setError] = useState('')
  const [, startTransition] = useTransition()

  useEffect(() => {
    getInsumos().then(data => { setInsumos(data); setLoading(false) })
  }, [])

  function openCreate() {
    setEditId(null)
    setForm({ nombre: '', descripcion: '', categoria: 'General', precio_unitario: '', stock: '0', imagen_url: '' })
    setError('')
    setShowForm(true)
  }

  function openEdit(ins: Insumo) {
    setEditId(ins.id)
    setForm({
      nombre: ins.nombre,
      descripcion: ins.descripcion ?? '',
      categoria: ins.categoria,
      precio_unitario: String(ins.precio_unitario),
      stock: String(ins.stock),
      imagen_url: ins.imagen_url ?? '',
    })
    setError('')
    setShowForm(true)
  }

  function handleSave() {
    const precio = parseInt(form.precio_unitario)
    const stock = parseInt(form.stock)
    if (!form.nombre.trim()) { setError('Nombre requerido'); return }
    if (!precio || precio <= 0) { setError('Precio inválido'); return }
    if (isNaN(stock) || stock < 0) { setError('Stock inválido'); return }
    setError('')
    startTransition(async () => {
      const data: Partial<Insumo> & { nombre: string; precio_unitario: number; stock: number; categoria: string } = {
        nombre: form.nombre,
        descripcion: form.descripcion || null,
        categoria: form.categoria || 'General',
        precio_unitario: precio,
        stock,
        imagen_url: form.imagen_url || null,
      }
      if (editId) {
        const result = await updateInsumo(editId, data)
        if (result.error) { setError(result.error); return }
        setInsumos(prev => prev.map(i => i.id === editId ? { ...i, ...data } : i))
      } else {
        const result = await createInsumo(data)
        if (result.error) { setError(result.error); return }
        if (result.insumo) setInsumos(prev => [...prev, result.insumo!])
      }
      setShowForm(false)
    })
  }

  function handleDelete(id: string, nombre: string) {
    if (!confirm(`¿Eliminar "${nombre}"? Esta acción no se puede deshacer.`)) return
    startTransition(async () => {
      const result = await deleteInsumo(id)
      if (result.error) { setError(result.error); return }
      setInsumos(prev => prev.filter(i => i.id !== id))
    })
  }

  function handleToggleActivo(ins: Insumo) {
    startTransition(async () => {
      await updateInsumo(ins.id, { activo: !ins.activo })
      setInsumos(prev => prev.map(i => i.id === ins.id ? { ...i, activo: !ins.activo } : i))
    })
  }

  const categorias = Array.from(new Set(insumos.map(i => i.categoria))).sort()

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2">{error}</p>}
      <button
        onClick={openCreate}
        className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl bg-orange-500 text-white hover:bg-orange-600 transition-colors"
      >
        <Plus size={14} /> Agregar insumo
      </button>

      {loading && <p className="text-sm text-muted-foreground">Cargando...</p>}

      {!loading && insumos.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">Sin insumos. Agregá el primero.</p>
      )}

      {categorias.map(cat => (
        <div key={cat}>
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">{cat}</p>
          <div className="space-y-2">
            {insumos.filter(i => i.categoria === cat).map(ins => (
              <div key={ins.id} className={`flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3 ${!ins.activo ? 'opacity-50' : ''}`}>
                <Package size={18} className="shrink-0 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm truncate">{ins.nombre}</p>
                    {!ins.activo && <span className="text-[10px] bg-secondary text-muted-foreground px-1.5 py-0.5 rounded-full">inactivo</span>}
                  </div>
                  {ins.descripcion && <p className="text-xs text-muted-foreground truncate">{ins.descripcion}</p>}
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs font-bold">{fmtARS(ins.precio_unitario)}</span>
                    <span className={`text-xs ${ins.stock <= 3 ? 'text-amber-500 font-semibold' : 'text-muted-foreground'}`}>
                      Stock: {ins.stock}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => openEdit(ins)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground">
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => handleToggleActivo(ins)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground text-[10px] font-semibold px-2">
                    {ins.activo ? 'Pausar' : 'Activar'}
                  </button>
                  <button onClick={() => handleDelete(ins.id, ins.nombre)} className="p-1.5 rounded-lg hover:bg-red-50 hover:text-red-600 text-muted-foreground">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Modal de formulario */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-background border border-border rounded-2xl p-5 space-y-4 overflow-y-auto" style={{ maxHeight: '90dvh' }}>
            <div className="flex items-center justify-between">
              <p className="font-bold">{editId ? 'Editar insumo' : 'Nuevo insumo'}</p>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-secondary"><XCircle size={16} /></button>
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Nombre *</label>
                <input type="text" value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))}
                  className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-orange-300" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Categoría</label>
                <input type="text" value={form.categoria} onChange={e => setForm(p => ({ ...p, categoria: e.target.value }))}
                  placeholder="General"
                  className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-orange-300" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Descripción</label>
                <input type="text" value={form.descripcion} onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))}
                  className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-orange-300" />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Precio (ARS) *</label>
                  <input type="number" value={form.precio_unitario} onChange={e => setForm(p => ({ ...p, precio_unitario: e.target.value }))}
                    className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-orange-300" />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Stock</label>
                  <input type="number" value={form.stock} onChange={e => setForm(p => ({ ...p, stock: e.target.value }))}
                    className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-orange-300" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">URL imagen (opcional)</label>
                <input type="url" value={form.imagen_url} onChange={e => setForm(p => ({ ...p, imagen_url: e.target.value }))}
                  className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-orange-300" />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleSave} className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-orange-500 text-white hover:bg-orange-600 transition-colors">
                {editId ? 'Guardar cambios' : 'Crear insumo'}
              </button>
              <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-border hover:bg-secondary">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Tab principal ─────────────────────────────────────────────────────────────

export default function InsumosAdminTab() {
  const [view, setView] = useState<'pedidos' | 'catalogo'>('pedidos')
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          onClick={() => setView('pedidos')}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${view === 'pedidos' ? 'bg-yellow-500 text-white border-yellow-500' : 'border-border text-muted-foreground hover:text-foreground'}`}
        >
          <Package size={13} /> Pedidos
        </button>
        <button
          onClick={() => setView('catalogo')}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${view === 'catalogo' ? 'bg-foreground text-primary-foreground border-foreground' : 'border-border text-muted-foreground hover:text-foreground'}`}
        >
          📦 Catálogo
        </button>
      </div>
      {view === 'pedidos' && <PedidosInsumos />}
      {view === 'catalogo' && <CatalogoInsumos />}
    </div>
  )
}
