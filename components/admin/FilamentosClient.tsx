'use client'

import { useState, useTransition } from 'react'
import { Plus, Trash2, X, ChevronDown, ChevronUp, Minus, PackagePlus, ShoppingBag, TrendingUp } from 'lucide-react'
import { MATERIALES, type Filamento, type FilamentoMovimiento, type VentaFilamento, type Material } from '@/lib/filamentos-helpers'
import {
  createFilamento,
  updateFilamento,
  deleteFilamento,
  registrarCompra,
  deleteMovimiento,
  getMovimientos,
  registrarVentaFilamento,
  getVentasFilamento,
  deleteVentaFilamento,
  getHistorialVentasFilamentos,
} from '@/lib/actions/filamentos'

// ── Helpers ──────────────────────────────────────────────────────────────────

function totalGramos(f: Filamento): number {
  return f.rollos_cerrados * f.peso_rollo_gr + f.gramos_sueltos
}

const MATERIAL_COLORS: Record<string, string> = {
  PLA: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700',
  PETG: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700',
  TPU: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700',
  ABS: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700',
  ASA: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700',
  Otro: 'bg-secondary text-muted-foreground border-border',
}

const COLOR_DOT: Record<string, string> = {
  blanco: 'bg-white border border-gray-300',
  negro: 'bg-gray-900',
  rojo: 'bg-red-500',
  azul: 'bg-blue-500',
  verde: 'bg-green-500',
  amarillo: 'bg-yellow-400',
  naranja: 'bg-orange-500',
  violeta: 'bg-purple-500',
  rosa: 'bg-pink-400',
  gris: 'bg-gray-400',
  marron: 'bg-amber-700',
  celeste: 'bg-sky-400',
  turquesa: 'bg-teal-400',
  transparente: 'bg-white border border-dashed border-gray-400',
}

function colorDot(color: string): string {
  const key = color.toLowerCase().trim().normalize('NFD').replace(/\p{Diacritic}/gu, '')
  for (const [name, cls] of Object.entries(COLOR_DOT)) {
    if (key.includes(name)) return cls
  }
  return 'bg-gradient-to-br from-secondary to-muted-foreground/30'
}

function fmtGr(gr: number): string {
  if (gr >= 1000) return `${(gr / 1000).toLocaleString('es-AR', { maximumFractionDigits: 2 })} kg`
  return `${Math.round(gr).toLocaleString('es-AR')} g`
}

function fmtDate(d: string): string {
  return new Date(d + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function fmtARS(n: number): string {
  return n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })
}

const inputCls = 'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20'

// ── Modal nuevo filamento ─────────────────────────────────────────────────────

function NuevoFilamentoModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: (f: Filamento) => void
}) {
  const [form, setForm] = useState({
    nombre: '', material: 'PLA' as Material, color: '',
    rollos_cerrados: 0, gramos_sueltos: 0, peso_rollo_gr: 1000, costo_kg: 0, nota: '',
  })
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  const set = (field: string, value: string | number) => setForm((f) => ({ ...f, [field]: value }))

  function handleSubmit() {
    if (!form.nombre.trim()) { setError('El nombre es requerido'); return }
    setError('')
    startTransition(async () => {
      const res = await createFilamento(form)
      if (res.error) { setError(res.error); return }
      if (res.filamento) onCreated(res.filamento)
      onClose()
    })
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-semibold">Nuevo filamento</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={16} /></button>
        </div>

        <div className="p-5 space-y-3">
          {error && <p className="text-xs text-red-500">{error}</p>}

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Nombre *</label>
            <input className={inputCls} value={form.nombre} placeholder="Ej: PLA Bambu Blanco"
              onChange={(e) => set('nombre', e.target.value)} autoFocus />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Material</label>
              <select className={inputCls} value={form.material}
                onChange={(e) => set('material', e.target.value)}>
                {MATERIALES.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Color</label>
              <input className={inputCls} value={form.color} placeholder="Ej: Blanco"
                onChange={(e) => set('color', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Rollos cerrados</label>
              <input type="number" min="0" className={inputCls} value={form.rollos_cerrados || ''}
                placeholder="0" onChange={(e) => set('rollos_cerrados', Number(e.target.value) || 0)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Gramos sueltos</label>
              <input type="number" min="0" className={inputCls} value={form.gramos_sueltos || ''}
                placeholder="0" onChange={(e) => set('gramos_sueltos', Number(e.target.value) || 0)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">g por rollo</label>
              <input type="number" min="1" className={inputCls} value={form.peso_rollo_gr || ''}
                placeholder="1000" onChange={(e) => set('peso_rollo_gr', Number(e.target.value) || 1000)} />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Costo del kg ($)</label>
            <input type="number" min="0" className={inputCls} value={form.costo_kg || ''}
              placeholder="0" onChange={(e) => set('costo_kg', Number(e.target.value) || 0)} />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Nota (opcional)</label>
            <input className={inputCls} value={form.nota} placeholder="Marca, proveedor, etc."
              onChange={(e) => set('nota', e.target.value)} />
          </div>
        </div>

        <div className="flex gap-2 p-5 border-t border-border">
          <button onClick={onClose}
            className="flex-1 px-4 py-2 text-sm border border-border rounded-lg hover:bg-secondary transition-colors">
            Cancelar
          </button>
          <button onClick={handleSubmit} disabled={isPending}
            className="flex-1 px-4 py-2 text-sm bg-foreground text-background rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity">
            {isPending ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Card de filamento ─────────────────────────────────────────────────────────

function FilamentoCard({
  filamento: initial,
  onUpdate,
  onDelete,
}: {
  filamento: Filamento
  onUpdate: (updated: Filamento) => void
  onDelete: () => void
}) {
  const [fil, setFil] = useState(initial)
  const [expanded, setExpanded] = useState(false)
  const [gramos, setGramos] = useState(String(initial.gramos_sueltos || ''))
  const [costoKgStr, setCostoKgStr] = useState(String(initial.costo_kg || ''))
  const [isPending, startTransition] = useTransition()

  // Historial
  const [movimientos, setMovimientos] = useState<FilamentoMovimiento[] | null>(null)
  const [ventas, setVentas] = useState<VentaFilamento[] | null>(null)
  const [loadingMovs, setLoadingMovs] = useState(false)

  // Formulario compra
  const today = new Date().toISOString().split('T')[0]
  const [showCompra, setShowCompra] = useState(false)
  const [compraForm, setCompraForm] = useState({ rollos: 0, gramos: 0, fecha: today, nota: '' })
  const [compraError, setCompraError] = useState('')

  // Formulario venta
  const [showVenta, setShowVenta] = useState(false)
  const [ventaForm, setVentaForm] = useState({ gramos: 0, precio_kg: 0, cliente: '', nota: '', fecha: today })
  const [ventaError, setVentaError] = useState('')

  const totalGr = fil.rollos_cerrados * fil.peso_rollo_gr + fil.gramos_sueltos

  function handleExpand() {
    setExpanded((v) => !v)
    if (!expanded && movimientos === null) {
      setLoadingMovs(true)
      Promise.all([getMovimientos(fil.id), getVentasFilamento(fil.id)]).then(([movs, vents]) => {
        setMovimientos(movs)
        setVentas(vents)
        setLoadingMovs(false)
      })
    }
  }

  function saveRollos(newRollos: number) {
    if (newRollos < 0) return
    startTransition(async () => {
      await updateFilamento(fil.id, { rollos_cerrados: newRollos })
      const updated = { ...fil, rollos_cerrados: newRollos }
      setFil(updated)
      onUpdate(updated)
    })
  }

  function saveGramos() {
    const gr = Math.max(0, Number(gramos) || 0)
    setGramos(String(gr))
    startTransition(async () => {
      await updateFilamento(fil.id, { gramos_sueltos: gr })
      const updated = { ...fil, gramos_sueltos: gr }
      setFil(updated)
      onUpdate(updated)
    })
  }

  function saveCostoKg() {
    const costo = Math.max(0, Number(costoKgStr) || 0)
    setCostoKgStr(String(costo))
    if (costo === fil.costo_kg) return
    startTransition(async () => {
      await updateFilamento(fil.id, { costo_kg: costo })
      const updated = { ...fil, costo_kg: costo }
      setFil(updated)
      onUpdate(updated)
    })
  }

  function handleRegistrarCompra() {
    if (compraForm.rollos <= 0 && compraForm.gramos <= 0) {
      setCompraError('Ingresá al menos rollos o gramos')
      return
    }
    setCompraError('')
    startTransition(async () => {
      const res = await registrarCompra(fil.id, compraForm)
      if (res.error) { setCompraError(res.error); return }
      if (res.filamento) {
        setFil(res.filamento)
        setGramos(String(res.filamento.gramos_sueltos || ''))
        onUpdate(res.filamento)
      }
      if (res.movimiento) {
        setMovimientos((prev) => prev ? [res.movimiento!, ...prev] : [res.movimiento!])
      }
      setCompraForm({ rollos: 0, gramos: 0, fecha: today, nota: '' })
      setShowCompra(false)
    })
  }

  function handleRegistrarVenta() {
    if (ventaForm.gramos <= 0) { setVentaError('Ingresá los gramos a vender'); return }
    if (ventaForm.gramos > totalGr) { setVentaError(`Stock insuficiente (${Math.round(totalGr)}g disponibles)`); return }
    setVentaError('')
    startTransition(async () => {
      const res = await registrarVentaFilamento(fil.id, { ...ventaForm, costo_kg: fil.costo_kg })
      if (res.error) { setVentaError(res.error); return }
      if (res.filamento) {
        setFil(res.filamento)
        setGramos(String(res.filamento.gramos_sueltos || ''))
        onUpdate(res.filamento)
      }
      if (res.venta) {
        setVentas((prev) => prev ? [res.venta!, ...prev] : [res.venta!])
      }
      setVentaForm({ gramos: 0, precio_kg: 0, cliente: '', nota: '', fecha: today })
      setShowVenta(false)
    })
  }

  function handleDeleteMovimiento(mov: FilamentoMovimiento) {
    startTransition(async () => {
      const res = await deleteMovimiento(mov.id, fil.id, mov.rollos, mov.gramos)
      if (res.filamento) {
        setFil(res.filamento)
        setGramos(String(res.filamento.gramos_sueltos || ''))
        onUpdate(res.filamento)
      }
      setMovimientos((prev) => prev ? prev.filter((m) => m.id !== mov.id) : prev)
    })
  }

  function handleDeleteVenta(v: VentaFilamento) {
    startTransition(async () => {
      const res = await deleteVentaFilamento(v.id, fil.id, v.gramos)
      if (res.filamento) {
        setFil(res.filamento)
        setGramos(String(res.filamento.gramos_sueltos || ''))
        onUpdate(res.filamento)
      }
      setVentas((prev) => prev ? prev.filter((x) => x.id !== v.id) : prev)
    })
  }

  function handleDelete() {
    if (!confirm(`¿Eliminar "${fil.nombre}"?`)) return
    startTransition(async () => {
      await deleteFilamento(fil.id)
      onDelete()
    })
  }

  // Calcular preview de venta
  const ventaGramos = ventaForm.gramos
  const ventaPrecioTotal = ventaGramos > 0 ? (ventaGramos / 1000) * ventaForm.precio_kg : 0
  const ventaCostoTotal = ventaGramos > 0 ? (ventaGramos / 1000) * fil.costo_kg : 0
  const ventaGanancia = ventaPrecioTotal - ventaCostoTotal
  const ventaMargen = ventaPrecioTotal > 0 ? (ventaGanancia / ventaPrecioTotal) * 100 : 0

  return (
    <div className={`bg-card border border-border rounded-xl overflow-hidden ${isPending ? 'opacity-70' : ''}`}>
      {/* ── Header siempre visible ── */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className={`w-3 h-3 rounded-full shrink-0 ${colorDot(fil.color)}`} />

        <button onClick={handleExpand} className="flex-1 text-left min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">{fil.nombre}</span>
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium border ${MATERIAL_COLORS[fil.material]}`}>
              {fil.material}
            </span>
            {fil.color && <span className="text-xs text-muted-foreground">{fil.color}</span>}
            {fil.costo_kg > 0 && <span className="text-xs text-muted-foreground">Costo: {fmtARS(fil.costo_kg)}/kg</span>}
          </div>
        </button>

        {/* Stock resumen */}
        <div className="text-right shrink-0">
          <p className={`font-bold text-sm tabular-nums ${totalGr === 0 ? 'text-red-500' : totalGr < 300 ? 'text-orange-500' : 'text-green-600'}`}>
            {fmtGr(totalGr)}
          </p>
          <p className="text-xs text-muted-foreground">
            {fil.rollos_cerrados > 0 ? `${fil.rollos_cerrados} rollo${fil.rollos_cerrados !== 1 ? 's' : ''}` : 'sin rollos'}
            {fil.gramos_sueltos > 0 ? ` + ${Math.round(fil.gramos_sueltos)}g` : ''}
          </p>
        </div>

        <button onClick={handleExpand} className="p-1.5 text-muted-foreground hover:text-foreground transition-colors">
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* ── Panel expandido ── */}
      {expanded && (
        <div className="border-t border-border space-y-5 px-4 pt-4 pb-4">

          {/* Rollos cerrados con +/- */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-2">
              Rollos cerrados ({fil.peso_rollo_gr}g c/u)
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => saveRollos(fil.rollos_cerrados - 1)}
                disabled={fil.rollos_cerrados <= 0 || isPending}
                className="w-9 h-9 flex items-center justify-center rounded-lg border border-border hover:bg-secondary disabled:opacity-30 transition-colors"
              >
                <Minus size={14} />
              </button>
              <span className="text-2xl font-bold w-10 text-center tabular-nums">{fil.rollos_cerrados}</span>
              <button
                onClick={() => saveRollos(fil.rollos_cerrados + 1)}
                disabled={isPending}
                className="w-9 h-9 flex items-center justify-center rounded-lg border border-border hover:bg-secondary transition-colors"
              >
                <Plus size={14} />
              </button>
              <span className="text-sm text-muted-foreground">= {fmtGr(fil.rollos_cerrados * fil.peso_rollo_gr)}</span>
            </div>
          </div>

          {/* Gramos sueltos */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-2">
              Gramos sueltos (rollo abierto o restos)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number" min="0"
                value={gramos}
                onChange={(e) => setGramos(e.target.value)}
                onBlur={saveGramos}
                onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                className="w-28 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20 tabular-nums"
                placeholder="0"
              />
              <span className="text-sm text-muted-foreground">g</span>
            </div>
          </div>

          {/* Costo por kg */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-2">Costo de compra ($/kg)</label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">$</span>
              <input
                type="number" min="0"
                value={costoKgStr}
                onChange={(e) => setCostoKgStr(e.target.value)}
                onBlur={saveCostoKg}
                onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                className="w-32 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20 tabular-nums"
                placeholder="0"
              />
              <span className="text-sm text-muted-foreground">/ kg</span>
            </div>
          </div>

          {/* Total */}
          <div className="bg-secondary/30 rounded-lg px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total disponible</span>
            <span className={`text-lg font-bold tabular-nums ${totalGr === 0 ? 'text-red-500' : 'text-foreground'}`}>
              {fmtGr(totalGr)}
            </span>
          </div>

          {fil.nota && <p className="text-xs text-muted-foreground italic">{fil.nota}</p>}

          {/* ── Botones de acción ── */}
          <div className="border-t border-border pt-4 flex gap-2 flex-wrap">
            {!showVenta && !showCompra && (
              <>
                <button
                  onClick={() => setShowVenta(true)}
                  disabled={totalGr <= 0}
                  className="flex items-center gap-2 text-sm font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-40 px-4 py-2 rounded-lg transition-colors"
                >
                  <ShoppingBag size={14} /> Registrar venta
                </button>
                <button
                  onClick={() => setShowCompra(true)}
                  className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground border border-border hover:border-foreground/30 px-3 py-2 rounded-lg transition-colors"
                >
                  <PackagePlus size={14} /> Registrar compra
                </button>
              </>
            )}
          </div>

          {/* ── Formulario venta ── */}
          {showVenta && (
            <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-green-800 dark:text-green-300">Registrar venta de filamento</p>
                <button onClick={() => { setShowVenta(false); setVentaError('') }} className="text-muted-foreground hover:text-foreground">
                  <X size={14} />
                </button>
              </div>
              {ventaError && <p className="text-xs text-red-500">{ventaError}</p>}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Gramos a vender *</label>
                  <div className="flex items-center gap-1">
                    <input type="number" min="1" max={totalGr} placeholder="0"
                      value={ventaForm.gramos || ''}
                      onChange={(e) => setVentaForm((f) => ({ ...f, gramos: Number(e.target.value) || 0 }))}
                      className="w-full text-sm border border-border rounded-lg px-2.5 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-green-400/40" />
                    <span className="text-xs text-muted-foreground shrink-0">g</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">Disp: {fmtGr(totalGr)}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Precio de venta ($/kg) *</label>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">$</span>
                    <input type="number" min="0" placeholder="0"
                      value={ventaForm.precio_kg || ''}
                      onChange={(e) => setVentaForm((f) => ({ ...f, precio_kg: Number(e.target.value) || 0 }))}
                      className="w-full text-sm border border-border rounded-lg px-2.5 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-green-400/40" />
                    <span className="text-xs text-muted-foreground shrink-0">/kg</span>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Cliente</label>
                  <input placeholder="Nombre del cliente"
                    value={ventaForm.cliente}
                    onChange={(e) => setVentaForm((f) => ({ ...f, cliente: e.target.value }))}
                    className="w-full text-sm border border-border rounded-lg px-2.5 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-green-400/40" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Fecha</label>
                  <input type="date" value={ventaForm.fecha}
                    onChange={(e) => setVentaForm((f) => ({ ...f, fecha: e.target.value }))}
                    className="w-full text-sm border border-border rounded-lg px-2.5 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-green-400/40" />
                </div>
              </div>

              {/* Preview ganancia */}
              {ventaGramos > 0 && ventaForm.precio_kg > 0 && (
                <div className="bg-white dark:bg-green-950/40 border border-green-200 dark:border-green-800 rounded-lg px-3 py-2.5 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-xs text-muted-foreground">Total venta</p>
                    <p className="text-sm font-bold">{fmtARS(ventaPrecioTotal)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Costo</p>
                    <p className="text-sm font-bold text-muted-foreground">{fmtARS(ventaCostoTotal)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Ganancia</p>
                    <p className={`text-sm font-bold ${ventaGanancia >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {fmtARS(ventaGanancia)} <span className="text-xs font-normal">({ventaMargen.toFixed(0)}%)</span>
                    </p>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button onClick={() => { setShowVenta(false); setVentaError('') }}
                  className="flex-1 text-sm border border-border rounded-lg py-1.5 hover:bg-secondary transition-colors">
                  Cancelar
                </button>
                <button onClick={handleRegistrarVenta} disabled={isPending}
                  className="flex-1 text-sm bg-green-600 text-white rounded-lg py-1.5 hover:bg-green-700 disabled:opacity-50 transition-colors">
                  {isPending ? 'Guardando...' : 'Confirmar venta'}
                </button>
              </div>
            </div>
          )}

          {/* ── Formulario compra ── */}
          {showCompra && (
            <div className="bg-secondary/20 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold">Nueva compra de filamento</p>
                <button onClick={() => { setShowCompra(false); setCompraError('') }}
                  className="text-muted-foreground hover:text-foreground">
                  <X size={14} />
                </button>
              </div>
              {compraError && <p className="text-xs text-red-500">{compraError}</p>}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Rollos cerrados</label>
                  <input type="number" min="0" placeholder="0" value={compraForm.rollos || ''}
                    onChange={(e) => setCompraForm((f) => ({ ...f, rollos: Number(e.target.value) || 0 }))}
                    className="w-full text-sm border border-border rounded-lg px-2.5 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-foreground/20" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Gramos sueltos</label>
                  <input type="number" min="0" placeholder="0" value={compraForm.gramos || ''}
                    onChange={(e) => setCompraForm((f) => ({ ...f, gramos: Number(e.target.value) || 0 }))}
                    className="w-full text-sm border border-border rounded-lg px-2.5 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-foreground/20" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Fecha</label>
                  <input type="date" value={compraForm.fecha}
                    onChange={(e) => setCompraForm((f) => ({ ...f, fecha: e.target.value }))}
                    className="w-full text-sm border border-border rounded-lg px-2.5 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-foreground/20" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Nota (opcional)</label>
                  <input placeholder="Proveedor, etc." value={compraForm.nota}
                    onChange={(e) => setCompraForm((f) => ({ ...f, nota: e.target.value }))}
                    className="w-full text-sm border border-border rounded-lg px-2.5 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-foreground/20" />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => { setShowCompra(false); setCompraError('') }}
                  className="flex-1 text-sm border border-border rounded-lg py-1.5 hover:bg-secondary transition-colors">
                  Cancelar
                </button>
                <button onClick={handleRegistrarCompra} disabled={isPending}
                  className="flex-1 text-sm bg-foreground text-background rounded-lg py-1.5 hover:opacity-90 disabled:opacity-50 transition-opacity">
                  {isPending ? 'Guardando...' : 'Registrar'}
                </button>
              </div>
            </div>
          )}

          {/* ── Historial ── */}
          {(loadingMovs || (movimientos !== null) || (ventas !== null)) && (
            <div className="border-t border-border pt-4 space-y-4">
              {loadingMovs ? (
                <p className="text-xs text-muted-foreground py-2">Cargando historial...</p>
              ) : (
                <>
                  {ventas && ventas.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Ventas</p>
                      <div className="space-y-1.5">
                        {ventas.map((v) => {
                          const total = (v.gramos / 1000) * v.precio_kg
                          const costo = (v.gramos / 1000) * v.costo_kg
                          const gan = total - costo
                          return (
                            <div key={v.id} className="flex items-center justify-between gap-2 text-xs group">
                              <div className="min-w-0 flex-1">
                                <span className="font-medium">{fmtGr(v.gramos)}</span>
                                {v.cliente && <span className="text-muted-foreground"> → {v.cliente}</span>}
                                <span className="text-green-600 font-medium"> {fmtARS(total)}</span>
                                {gan > 0 && <span className="text-muted-foreground"> · gan. {fmtARS(gan)}</span>}
                              </div>
                              <span className="text-muted-foreground shrink-0">{fmtDate(v.fecha)}</span>
                              <button onClick={() => handleDeleteVenta(v)} disabled={isPending}
                                className="p-1 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all disabled:opacity-30">
                                <Trash2 size={10} />
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {movimientos && movimientos.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Compras</p>
                      <div className="space-y-1.5">
                        {movimientos.map((mov) => (
                          <div key={mov.id} className="flex items-center justify-between gap-2 text-xs group">
                            <div className="min-w-0 flex-1">
                              <span className="font-medium">
                                {mov.rollos > 0 && `${mov.rollos} rollo${mov.rollos !== 1 ? 's' : ''}`}
                                {mov.rollos > 0 && mov.gramos > 0 && ' + '}
                                {mov.gramos > 0 && `${Math.round(mov.gramos)}g`}
                              </span>
                              {mov.nota && <span className="text-muted-foreground"> — {mov.nota}</span>}
                            </div>
                            <span className="text-muted-foreground shrink-0">{fmtDate(mov.fecha)}</span>
                            <button onClick={() => handleDeleteMovimiento(mov)} disabled={isPending}
                              className="p-1 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all disabled:opacity-30">
                              <Trash2 size={10} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Eliminar */}
          <div className="flex justify-end border-t border-border pt-3">
            <button onClick={handleDelete} disabled={isPending}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive border border-border hover:border-destructive/40 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">
              <Trash2 size={12} /> Eliminar filamento
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Vista historial global de ventas ──────────────────────────────────────────

function HistorialVentas() {
  const [ventas, setVentas] = useState<VentaFilamento[] | null>(null)
  const [loading, setLoading] = useState(false)

  if (ventas === null && !loading) {
    setLoading(true)
    getHistorialVentasFilamentos().then((data) => {
      setVentas(data)
      setLoading(false)
    })
  }

  if (loading) return <p className="text-sm text-muted-foreground py-8 text-center">Cargando...</p>
  if (!ventas || ventas.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-10 text-center text-muted-foreground">
        <p className="text-2xl mb-2">📊</p>
        <p className="text-sm">Sin ventas registradas todavía</p>
      </div>
    )
  }

  const totalVendido = ventas.reduce((s, v) => s + (v.gramos / 1000) * v.precio_kg, 0)
  const totalCosto = ventas.reduce((s, v) => s + (v.gramos / 1000) * v.costo_kg, 0)
  const totalGanancia = totalVendido - totalCosto
  const totalKg = ventas.reduce((s, v) => s + v.gramos / 1000, 0)

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total vendido', value: fmtARS(totalVendido), color: 'text-foreground' },
          { label: 'Costo total', value: fmtARS(totalCosto), color: 'text-muted-foreground' },
          { label: 'Ganancia total', value: fmtARS(totalGanancia), color: totalGanancia >= 0 ? 'text-green-600' : 'text-red-600' },
          { label: 'kg vendidos', value: `${totalKg.toFixed(2)} kg`, color: 'text-blue-600' },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground">{kpi.label}</p>
            <p className={`text-lg font-bold mt-0.5 ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Tabla */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/30 text-xs text-muted-foreground">
                <th className="text-left px-4 py-2.5 font-medium">Fecha</th>
                <th className="text-left px-4 py-2.5 font-medium">Filamento</th>
                <th className="text-left px-4 py-2.5 font-medium hidden sm:table-cell">Cliente</th>
                <th className="text-right px-4 py-2.5 font-medium">Cantidad</th>
                <th className="text-right px-4 py-2.5 font-medium">Precio/kg</th>
                <th className="text-right px-4 py-2.5 font-medium">Total</th>
                <th className="text-right px-4 py-2.5 font-medium">Ganancia</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {ventas.map((v) => {
                const total = (v.gramos / 1000) * v.precio_kg
                const costo = (v.gramos / 1000) * v.costo_kg
                const gan = total - costo
                return (
                  <tr key={v.id} className="hover:bg-secondary/20">
                    <td className="px-4 py-2.5 text-muted-foreground">{fmtDate(v.fecha)}</td>
                    <td className="px-4 py-2.5">
                      <span className="font-medium">{v.filamento_nombre}</span>
                      {v.filamento_color && <span className="text-xs text-muted-foreground ml-1">{v.filamento_color}</span>}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground hidden sm:table-cell">{v.cliente || '—'}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{fmtGr(v.gramos)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{fmtARS(v.precio_kg)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-medium">{fmtARS(total)}</td>
                    <td className={`px-4 py-2.5 text-right tabular-nums font-semibold ${gan >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {fmtARS(gan)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── Vista principal ────────────────────────────────────────────────────────────

export default function FilamentosClient({ initialFilamentos }: { initialFilamentos: Filamento[] }) {
  const [filamentos, setFilamentos] = useState<Filamento[]>(initialFilamentos)
  const [showNuevo, setShowNuevo] = useState(false)
  const [tab, setTab] = useState<'stock' | 'ventas'>('stock')

  function handleCreated(f: Filamento) {
    setFilamentos((prev) =>
      [...prev, f].sort((a, b) => a.material.localeCompare(b.material) || a.nombre.localeCompare(b.nombre))
    )
  }

  function handleUpdate(updated: Filamento) {
    setFilamentos((prev) => prev.map((f) => f.id === updated.id ? updated : f))
  }

  function handleDelete(id: string) {
    setFilamentos((prev) => prev.filter((f) => f.id !== id))
  }

  const totalGr = filamentos.reduce((s, f) => s + totalGramos(f), 0)
  const totalRollos = filamentos.reduce((s, f) => s + f.rollos_cerrados, 0)

  const porMaterial = filamentos.reduce<Record<string, Filamento[]>>((acc, f) => {
    if (!acc[f.material]) acc[f.material] = []
    acc[f.material].push(f)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      {showNuevo && (
        <NuevoFilamentoModal onClose={() => setShowNuevo(false)} onCreated={handleCreated} />
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">🧵 Filamentos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {filamentos.length} tipo{filamentos.length !== 1 ? 's' : ''}
            {totalGr > 0 && ` · ${fmtGr(totalGr)} totales`}
            {totalRollos > 0 && ` · ${totalRollos} rollo${totalRollos !== 1 ? 's' : ''} cerrado${totalRollos !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNuevo(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Plus size={14} /> Nuevo filamento
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button onClick={() => setTab('stock')}
          className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${tab === 'stock' ? 'bg-foreground text-primary-foreground border-foreground' : 'border-border text-muted-foreground hover:text-foreground'}`}>
          🧵 Stock
        </button>
        <button onClick={() => setTab('ventas')}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${tab === 'ventas' ? 'bg-green-600 text-white border-green-600' : 'border-border text-muted-foreground hover:text-foreground hover:border-green-400'}`}>
          <TrendingUp size={13} /> Historial ventas
        </button>
      </div>

      {tab === 'ventas' && <HistorialVentas />}

      {tab === 'stock' && (
        <>
          {/* Resumen por material */}
          {filamentos.length > 0 && Object.keys(porMaterial).length > 1 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {Object.entries(porMaterial).map(([mat, items]) => {
                const grTotal = items.reduce((s, f) => s + totalGramos(f), 0)
                return (
                  <div key={mat} className="bg-card border border-border rounded-xl px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${MATERIAL_COLORS[mat]}`}>
                      {mat}
                    </span>
                    <p className="text-lg font-bold mt-1 tabular-nums">{fmtGr(grTotal)}</p>
                    <p className="text-xs text-muted-foreground">{items.length} tipo{items.length !== 1 ? 's' : ''}</p>
                  </div>
                )
              })}
              <div className="bg-card border border-border rounded-xl px-4 py-3">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total</span>
                <p className="text-lg font-bold mt-1 tabular-nums">{fmtGr(totalGr)}</p>
                <p className="text-xs text-muted-foreground">{filamentos.length} filamento{filamentos.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
          )}

          {filamentos.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground">
              <p className="text-3xl mb-3">🧵</p>
              <p className="font-medium">Sin filamentos registrados</p>
              <p className="text-sm mt-1">Agregá el primero con el botón de arriba</p>
              <button onClick={() => setShowNuevo(true)}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity">
                <Plus size={14} /> Nuevo filamento
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(porMaterial).map(([mat, items]) => (
                <section key={mat}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${MATERIAL_COLORS[mat]}`}>
                      {mat}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {fmtGr(items.reduce((s, f) => s + totalGramos(f), 0))} total
                    </span>
                  </div>
                  <div className="space-y-2">
                    {items.map((f) => (
                      <FilamentoCard key={f.id} filamento={f} onUpdate={handleUpdate} onDelete={() => handleDelete(f.id)} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
