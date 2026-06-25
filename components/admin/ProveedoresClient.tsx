'use client'

import { useState, useTransition } from 'react'
import { createProveedor, updateProveedor, deleteProveedor, createProveedorCompra, deleteProveedorCompra } from '@/lib/actions/proveedores'
import type { Proveedor, ProveedorCompra } from '@/lib/actions/proveedores'
import { Plus, Trash2, ChevronDown, ChevronUp, X, Edit2, Check } from 'lucide-react'
import { formatARS, EGRESO_CATEGORIA_LABELS } from '@/lib/utils'

const inputCls = 'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20'
const today = () => new Date().toISOString().split('T')[0]

interface ProveedorWithCompras extends Proveedor {
  compras?: ProveedorCompra[]
}

export default function ProveedoresClient({ initialProveedores }: { initialProveedores: Proveedor[] }) {
  const [proveedores, setProveedores] = useState<ProveedorWithCompras[]>(initialProveedores)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [loadedCompras, setLoadedCompras] = useState<Record<string, ProveedorCompra[]>>({})
  const [showNuevo, setShowNuevo] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  // Formulario nuevo/editar proveedor
  const [form, setForm] = useState({ nombre: '', contacto: '', email: '', telefono: '', nota: '' })
  // Formulario nueva compra
  const [compraForm, setCompraForm] = useState({
    descripcion: '', categoria: 'filamento_insumos', monto: '', fecha: today(), nota: '',
  })
  const [compraError, setCompraError] = useState<Record<string, string>>({})

  function toggleExpand(id: string) {
    if (expandedId === id) { setExpandedId(null); return }
    setExpandedId(id)
    if (!loadedCompras[id]) {
      import('@/lib/actions/proveedores').then(({ getProveedor }) =>
        getProveedor(id).then((p) => {
          if (p) setLoadedCompras((prev) => ({ ...prev, [id]: p.compras }))
        })
      )
    }
  }

  function handleNuevo() {
    setForm({ nombre: '', contacto: '', email: '', telefono: '', nota: '' })
    setShowNuevo(true)
    setEditingId(null)
  }

  function handleEdit(p: Proveedor) {
    setForm({ nombre: p.nombre, contacto: p.contacto, email: p.email, telefono: p.telefono, nota: p.nota })
    setEditingId(p.id)
    setShowNuevo(false)
  }

  function handleSave() {
    if (!form.nombre.trim()) { setError('El nombre es requerido'); return }
    setError('')
    startTransition(async () => {
      if (editingId) {
        await updateProveedor(editingId, form)
        setProveedores((prev) => prev.map((p) => p.id === editingId ? { ...p, ...form } : p))
        setEditingId(null)
      } else {
        const res = await createProveedor(form)
        if ('error' in res && res.error) { setError(res.error); return }
        if ('proveedor' in res && res.proveedor) {
          setProveedores((prev) => [...prev, res.proveedor as Proveedor])
        }
        setShowNuevo(false)
      }
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteProveedor(id)
      setProveedores((prev) => prev.filter((p) => p.id !== id))
    })
  }

  function handleAddCompra(proveedorId: string) {
    if (!compraForm.descripcion.trim()) { setCompraError({ [proveedorId]: 'Falta descripción' }); return }
    if (!compraForm.monto || Number(compraForm.monto) <= 0) { setCompraError({ [proveedorId]: 'Monto inválido' }); return }
    setCompraError({})
    startTransition(async () => {
      await createProveedorCompra({
        proveedor_id: proveedorId,
        descripcion: compraForm.descripcion.trim(),
        categoria: compraForm.categoria,
        monto: Number(compraForm.monto),
        fecha: compraForm.fecha,
        nota: compraForm.nota,
      })
      const { getProveedor } = await import('@/lib/actions/proveedores')
      const p = await getProveedor(proveedorId)
      if (p) setLoadedCompras((prev) => ({ ...prev, [proveedorId]: p.compras }))
      setCompraForm({ descripcion: '', categoria: 'filamento_insumos', monto: '', fecha: today(), nota: '' })
    })
  }

  async function handleDeleteCompra(id: string, proveedorId: string) {
    await deleteProveedorCompra(id, proveedorId)
    setLoadedCompras((prev) => ({ ...prev, [proveedorId]: (prev[proveedorId] ?? []).filter((c) => c.id !== id) }))
  }

  const FormFields = () => (
    <div className="grid grid-cols-2 gap-3">
      <div className="col-span-2">
        <label className="text-xs font-medium text-muted-foreground block mb-1">Nombre *</label>
        <input className={inputCls} value={form.nombre} onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))} placeholder="Proveedor S.A." />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground block mb-1">Contacto</label>
        <input className={inputCls} value={form.contacto} onChange={(e) => setForm((f) => ({ ...f, contacto: e.target.value }))} placeholder="Nombre del vendedor" />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground block mb-1">Teléfono</label>
        <input className={inputCls} value={form.telefono} onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))} placeholder="+54 ..." />
      </div>
      <div className="col-span-2">
        <label className="text-xs font-medium text-muted-foreground block mb-1">Email</label>
        <input type="email" className={inputCls} value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="contacto@proveedor.com" />
      </div>
      <div className="col-span-2">
        <label className="text-xs font-medium text-muted-foreground block mb-1">Notas</label>
        <textarea className={inputCls} rows={2} value={form.nota} onChange={(e) => setForm((f) => ({ ...f, nota: e.target.value }))} placeholder="Condiciones de pago, plazos, etc." />
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">🏭 Proveedores</h1>
          <p className="text-sm text-muted-foreground mt-1">{proveedores.length} proveedor{proveedores.length !== 1 ? 'es' : ''} registrado{proveedores.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={handleNuevo} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity">
          <Plus size={14} /> Nuevo proveedor
        </button>
      </div>

      {/* Modal nuevo/editar */}
      {(showNuevo || editingId) && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">{editingId ? 'Editar proveedor' : 'Nuevo proveedor'}</h2>
              <button onClick={() => { setShowNuevo(false); setEditingId(null) }} className="text-muted-foreground hover:text-foreground">
                <X size={16} />
              </button>
            </div>
            <FormFields />
            {error && <p className="text-xs text-red-500">{error}</p>}
            <div className="flex gap-2 pt-1">
              <button onClick={() => { setShowNuevo(false); setEditingId(null) }}
                className="flex-1 px-4 py-2 text-sm border border-border rounded-lg hover:bg-secondary transition-colors">
                Cancelar
              </button>
              <button onClick={handleSave} disabled={isPending}
                className="flex-1 px-4 py-2 text-sm bg-foreground text-background rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity">
                {isPending ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lista de proveedores */}
      {proveedores.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground">
          <p className="font-medium">Sin proveedores</p>
          <p className="text-sm mt-1">Creá el primero con el botón de arriba</p>
        </div>
      ) : (
        <div className="space-y-3">
          {proveedores.map((p) => {
            const compras = loadedCompras[p.id] ?? []
            const totalCompras = compras.reduce((s, c) => s + Number(c.monto), 0)
            const isExpanded = expandedId === p.id

            return (
              <div key={p.id} className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <button onClick={() => toggleExpand(p.id)} className="flex-1 text-left">
                    <p className="font-semibold">{p.nombre}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                      {p.contacto && <span>{p.contacto}</span>}
                      {p.telefono && <span>📱 {p.telefono}</span>}
                      {p.email && <span>✉️ {p.email}</span>}
                    </div>
                  </button>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => handleEdit(p)} className="p-1.5 rounded-lg border border-border hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                      <Edit2 size={13} />
                    </button>
                    <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors">
                      <Trash2 size={13} />
                    </button>
                    <button onClick={() => toggleExpand(p.id)} className="p-1.5 text-muted-foreground hover:text-foreground transition-colors">
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-border p-4 space-y-4">
                    {p.nota && <p className="text-xs text-muted-foreground italic">{p.nota}</p>}

                    {/* Formulario nueva compra */}
                    <div className="bg-secondary/30 rounded-lg p-3 space-y-3">
                      <p className="text-xs font-semibold">Registrar compra</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="col-span-2">
                          <input className="w-full text-xs border border-border rounded-lg px-2 py-1.5 bg-background focus:outline-none"
                            placeholder="Descripción *" value={compraForm.descripcion}
                            onChange={(e) => setCompraForm((f) => ({ ...f, descripcion: e.target.value }))} />
                        </div>
                        <select className="text-xs border border-border rounded-lg px-2 py-1.5 bg-background"
                          value={compraForm.categoria}
                          onChange={(e) => setCompraForm((f) => ({ ...f, categoria: e.target.value }))}>
                          {Object.entries(EGRESO_CATEGORIA_LABELS).map(([k, v]) => (
                            <option key={k} value={k}>{v}</option>
                          ))}
                        </select>
                        <input type="number" min="0" placeholder="Monto *" value={compraForm.monto}
                          onChange={(e) => setCompraForm((f) => ({ ...f, monto: e.target.value }))}
                          className="text-xs border border-border rounded-lg px-2 py-1.5 bg-background focus:outline-none" />
                        <input type="date" value={compraForm.fecha}
                          onChange={(e) => setCompraForm((f) => ({ ...f, fecha: e.target.value }))}
                          className="text-xs border border-border rounded-lg px-2 py-1.5 bg-background focus:outline-none" />
                        <input placeholder="Nota (opcional)" value={compraForm.nota}
                          onChange={(e) => setCompraForm((f) => ({ ...f, nota: e.target.value }))}
                          className="text-xs border border-border rounded-lg px-2 py-1.5 bg-background focus:outline-none" />
                      </div>
                      {compraError[p.id] && <p className="text-xs text-red-500">{compraError[p.id]}</p>}
                      <button onClick={() => handleAddCompra(p.id)} disabled={isPending}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-foreground text-background hover:opacity-90 disabled:opacity-50 transition-opacity">
                        <Plus size={11} /> Registrar
                      </button>
                    </div>

                    {/* Historial de compras */}
                    {compras.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-semibold">Compras registradas</p>
                          <p className="text-xs font-semibold text-green-600">{formatARS(totalCompras)} total</p>
                        </div>
                        <div className="space-y-1">
                          {compras.map((c) => (
                            <div key={c.id} className="flex items-center justify-between gap-2 text-xs group">
                              <div className="min-w-0 flex-1">
                                <span className="font-medium">{c.descripcion}</span>
                                {c.nota && <span className="text-muted-foreground"> — {c.nota}</span>}
                                <span className="text-muted-foreground"> · {EGRESO_CATEGORIA_LABELS[c.categoria as keyof typeof EGRESO_CATEGORIA_LABELS] ?? c.categoria} · {c.fecha}</span>
                              </div>
                              <span className="font-semibold shrink-0">{formatARS(c.monto)}</span>
                              <button onClick={() => handleDeleteCompra(c.id, p.id)}
                                className="p-1 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all">
                                <Trash2 size={10} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
