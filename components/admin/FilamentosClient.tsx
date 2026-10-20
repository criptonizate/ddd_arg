'use client'

import { useState, useEffect, useTransition, useRef } from 'react'
import { Plus, Trash2, X, ChevronDown, ChevronUp, Minus, PackagePlus, ShoppingBag, TrendingUp, Pencil, Image as ImageIcon, CheckCircle2, Clock, Package, Phone, Loader2, AlertCircle } from 'lucide-react'
import { MATERIALES, TIPOS_FILAMENTO, MARCAS_SUGERIDAS, tierPrecio, PRECIO_TIERS, type Filamento, type FilamentoMovimiento, type VentaFilamento, type Material } from '@/lib/filamentos-helpers'
import {
  createFilamento,
  updateFilamento,
  deleteFilamento,
  registrarCompra,
  deleteMovimiento,
  getMovimientos,
  registrarVentaFilamento,
  descontarUsoPropioFilamento,
  getVentasFilamento,
  deleteVentaFilamento,
  getHistorialVentasFilamentos,
  getKgMensualesCliente,
} from '@/lib/actions/filamentos'
import { createClienteRapido, updateClienteBasico, getClientesConVentasFilamento, type ClienteFilamentoStats } from '@/lib/actions/clientes'
import { getVentasDeCliente } from '@/lib/actions/filamentos'
import { getFilamentoPedidos, updateEstadoPedidoFilamento, confirmarPedidoYDescontarStock, type FilamentoPedido } from '@/lib/actions/filamento-pedidos'
import { createBrowserClient } from '@supabase/ssr'

type ClienteBasic = { id: string; nombre: string; dni: string | null; telefono: string | null; email: string | null; direccion: string | null }

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

function shortNombre(nombre: string): string {
  return nombre.replace(/\s+high\s+speed\b/gi, '').replace(/\s+hs\b/gi, '').trim()
}

function colorToCss(color: string): string {
  const c = color.toLowerCase()
  if (c.includes('black'))                          return '#111111'
  if (c.includes('white'))                          return '#f5f5f5'
  if (c.includes('grey') || c.includes('gray'))     return '#9ca3af'
  if (c.includes('vermilion') || c.includes('ruby')) return '#c0392b'
  if (c.includes('berry') || c.includes('red'))     return '#e53e3e'
  if (c.includes('blue'))                           return '#3b82f6'
  if (c.includes('teal'))                           return '#14b8a6'
  if (c.includes('olive'))                          return '#84a830'
  if (c.includes('green'))                          return '#22c55e'
  if (c.includes('yellow') || c.includes('sunshine')) return '#eab308'
  if (c.includes('orange'))                         return '#f97316'
  if (c.includes('taro') || c.includes('purple'))   return '#a855f7'
  if (c.includes('pink'))                           return '#ec4899'
  if (c.includes('brown') || c.includes('madera'))  return '#92400e'
  if (c.includes('silk') || c.includes('gold'))     return '#d97706'
  return '#94a3b8'
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
    nombre: '', marca: '', tipo: 'Común', material: 'PLA' as Material, color: '',
    rollos_cerrados: 0, gramos_sueltos: 0, peso_rollo_gr: 1000, costo_kg: 0, nota: '',
  })
  const [marcaInput, setMarcaInput] = useState('')
  const [showMarcaSugs, setShowMarcaSugs] = useState(false)
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
            <div className="relative">
              <label className="text-xs font-medium text-muted-foreground block mb-1">Marca</label>
              <input className={inputCls} value={form.marca}
                placeholder="GST3D, Fremover..."
                onChange={(e) => { set('marca', e.target.value); setShowMarcaSugs(true) }}
                onFocus={() => setShowMarcaSugs(true)}
                onBlur={() => setTimeout(() => setShowMarcaSugs(false), 150)} />
              {showMarcaSugs && (
                <div className="absolute z-10 top-full mt-1 w-full bg-card border border-border rounded-lg shadow-lg overflow-hidden">
                  {[...MARCAS_SUGERIDAS.filter(m => !form.marca || m.toLowerCase().includes(form.marca.toLowerCase())), ...(form.marca && !MARCAS_SUGERIDAS.includes(form.marca) ? [form.marca] : [])].map((m) => (
                    <button key={m} type="button" onMouseDown={() => { set('marca', m); setShowMarcaSugs(false) }}
                      className="w-full text-left px-3 py-1.5 text-sm hover:bg-secondary transition-colors">
                      {m}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Tipo</label>
              <select className={inputCls} value={form.tipo} onChange={(e) => set('tipo', e.target.value)}>
                {TIPOS_FILAMENTO.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
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
  clientes,
  onUpdate,
  onDelete,
}: {
  filamento: Filamento
  clientes: ClienteBasic[]
  onUpdate: (updated: Filamento) => void
  onDelete: () => void
}) {
  const [fil, setFil] = useState(initial)
  const [expanded, setExpanded] = useState(false)
  const [gramos, setGramos] = useState(String(initial.gramos_sueltos || ''))
  const [costoKgStr, setCostoKgStr] = useState(String(initial.costo_kg || ''))
  const [marcaInput, setMarcaInput] = useState(initial.marca || '')
  const [tipoInput, setTipoInput] = useState(initial.tipo || 'Común')
  const [showMarcaSugs, setShowMarcaSugs] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Historial
  const [movimientos, setMovimientos] = useState<FilamentoMovimiento[] | null>(null)
  const [ventas, setVentas] = useState<VentaFilamento[] | null>(null)
  const [loadingMovs, setLoadingMovs] = useState(false)

  const today = new Date().toISOString().split('T')[0]

  // Formulario compra
  const [showCompra, setShowCompra] = useState(false)
  const [compraForm, setCompraForm] = useState({ rollos: 0, gramos: 0, fecha: today, nota: '' })
  const [compraError, setCompraError] = useState('')

  // Formulario venta
  const [showVenta, setShowVenta] = useState(false)
  const [ventaKg, setVentaKg] = useState(1)
  const [ventaPrecioKg, setVentaPrecioKg] = useState('22000')
  const [ventaCliente, setVentaCliente] = useState('')
  const [ventaClienteId, setVentaClienteId] = useState<string | null>(null)
  const [ventaClienteKgMes, setVentaClienteKgMes] = useState<number | null>(null)
  const [ventaClienteSearch, setVentaClienteSearch] = useState('')
  const [ventaFecha, setVentaFecha] = useState(today)
  const [ventaError, setVentaError] = useState('')
  // Crear cliente nuevo inline
  const [showNuevoCliente, setShowNuevoCliente] = useState(false)
  const [nuevoClienteNombre, setNuevoClienteNombre] = useState('')
  const [nuevoClienteDni, setNuevoClienteDni] = useState('')
  const [nuevoClienteError, setNuevoClienteError] = useState('')
  const [clientesLocal, setClientesLocal] = useState<ClienteBasic[]>(clientes)

  // Formulario uso propio
  const [showUsoPropio, setShowUsoPropio] = useState(false)
  const [usoPropioGr, setUsoPropioGr] = useState('')
  const [usoPropioError, setUsoPropioError] = useState('')

  // Imágenes (hasta 3)
  const [uploadingSlot, setUploadingSlot] = useState<1 | 2 | 3 | null>(null)
  const imgRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)]

  const IMG_FIELDS = ['imagen_url', 'imagen_url_2', 'imagen_url_3'] as const

  async function handleImageUpload(file: File, slot: 1 | 2 | 3) {
    if (!file) return
    setUploadingSlot(slot)
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `${fil.id}-${slot}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('filamentos-fotos')
        .upload(path, file, { upsert: true })
      if (upErr) { alert('Error subiendo imagen: ' + upErr.message); return }
      const { data } = supabase.storage.from('filamentos-fotos').getPublicUrl(path)
      const url = data.publicUrl
      const field = IMG_FIELDS[slot - 1]
      await updateFilamento(fil.id, { [field]: url })
      const updated = { ...fil, [field]: url }
      setFil(updated)
      onUpdate(updated)
    } finally {
      setUploadingSlot(null)
    }
  }

  async function handleImageRemove(slot: 1 | 2 | 3) {
    const field = IMG_FIELDS[slot - 1]
    await updateFilamento(fil.id, { [field]: null })
    const updated = { ...fil, [field]: null }
    setFil(updated)
    onUpdate(updated)
  }

  const imgUrls = [fil.imagen_url, fil.imagen_url_2, fil.imagen_url_3] as const

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

  function saveMarca() {
    const m = marcaInput.trim()
    if (m === fil.marca) return
    startTransition(async () => {
      await updateFilamento(fil.id, { marca: m })
      const updated = { ...fil, marca: m }
      setFil(updated)
      onUpdate(updated)
    })
  }

  function saveTipo(t: string) {
    if (t === fil.tipo) return
    setTipoInput(t)
    startTransition(async () => {
      await updateFilamento(fil.id, { tipo: t })
      const updated = { ...fil, tipo: t }
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
    const kg = ventaKg
    const precio = parseFloat(ventaPrecioKg)
    if (!kg || kg <= 0) { setVentaError('Ingresá los kg a vender'); return }
    const gramos = Math.round(kg * 1000)
    if (gramos > totalGr) { setVentaError(`Stock insuficiente (${Math.floor(totalGr / 1000)} kg disponibles)`); return }
    setVentaError('')
    startTransition(async () => {
      const res = await registrarVentaFilamento(fil.id, {
        gramos, precio_kg: precio, costo_kg: fil.costo_kg,
        cliente: ventaCliente, cliente_id: ventaClienteId, nota: '', fecha: ventaFecha,
      })
      if (res.error) { setVentaError(res.error); return }
      if (res.filamento) { setFil(res.filamento); setGramos(String(res.filamento.gramos_sueltos || '')); onUpdate(res.filamento) }
      if (res.venta) setVentas((prev) => prev ? [res.venta!, ...prev] : [res.venta!])
      setVentaKg(1); clearCliente(); setVentaFecha(today); setShowVenta(false)
    })
  }

  function handleUsoPropioConfirmar() {
    const gr = parseFloat(usoPropioGr)
    if (!gr || gr <= 0) { setUsoPropioError('Ingresá los gramos a descontar'); return }
    if (gr > totalGr) { setUsoPropioError(`Stock insuficiente (${Math.round(totalGr)}g disponibles)`); return }
    setUsoPropioError('')
    startTransition(async () => {
      const res = await descontarUsoPropioFilamento(fil.id, gr)
      if (res.error) { setUsoPropioError(res.error); return }
      if (res.filamento) { setFil(res.filamento); setGramos(String(res.filamento.gramos_sueltos || '')); onUpdate(res.filamento) }
      setUsoPropioGr(''); setShowUsoPropio(false)
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

  // Preview venta
  const ventaKgNum = ventaKg || 0
  const ventaPrecioKgNum = parseFloat(ventaPrecioKg) || 0
  const ventaPrecioTotal = ventaKgNum * ventaPrecioKgNum
  const ventaCostoTotal = ventaKgNum * fil.costo_kg
  const ventaGanancia = ventaPrecioTotal - ventaCostoTotal
  const ventaMargen = ventaPrecioTotal > 0 ? (ventaGanancia / ventaPrecioTotal) * 100 : 0
  // Tier de precio basado en acumulado mensual del cliente
  const kgMesAcum = (ventaClienteKgMes ?? 0) + ventaKgNum
  const tierSugerido = tierPrecio(kgMesAcum)

  async function onClienteSelect(c: ClienteBasic) {
    setVentaClienteId(c.id)
    setVentaCliente(c.nombre)
    setVentaClienteSearch(c.nombre)
    setVentaClienteKgMes(null)
    const mes = ventaFecha.slice(0, 7)
    const kg = await getKgMensualesCliente(c.id, mes)
    setVentaClienteKgMes(kg)
    setVentaPrecioKg(String(tierPrecio(kg + ventaKgNum)))
  }

  function clearCliente() {
    setVentaClienteId(null)
    setVentaCliente('')
    setVentaClienteSearch('')
    setVentaClienteKgMes(null)
    setVentaPrecioKg('22000')
  }

  async function handleCrearCliente() {
    if (!nuevoClienteNombre.trim()) { setNuevoClienteError('El nombre es requerido'); return }
    setNuevoClienteError('')
    const res = await createClienteRapido(nuevoClienteNombre.trim(), nuevoClienteDni.trim() || undefined)
    if ('error' in res) { setNuevoClienteError(res.error); return }
    const nuevo: ClienteBasic = { id: res.id, nombre: res.nombre, dni: res.dni, telefono: null, email: null, direccion: null }
    setClientesLocal(prev => [...prev, nuevo].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')))
    setShowNuevoCliente(false)
    setNuevoClienteNombre('')
    setNuevoClienteDni('')
    await onClienteSelect(nuevo)
  }

  return (
    <div className={`bg-card border border-border rounded-xl overflow-hidden ${isPending ? 'opacity-70' : ''}`}>
      {/* ── Header siempre visible ── */}
      <div className="flex items-center gap-3 px-4 py-3">
        {(fil.imagen_url || fil.imagen_url_2 || fil.imagen_url_3) ? (
          <img src={fil.imagen_url ?? fil.imagen_url_2 ?? fil.imagen_url_3 ?? ''} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0 border border-border" />
        ) : (
          <div className={`w-3 h-3 rounded-full shrink-0 ${colorDot(fil.color)}`} />
        )}

        <button onClick={handleExpand} className="flex-1 text-left min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {fil.marca && <span className="text-xs font-semibold text-foreground/70">{fil.marca}</span>}
            <span className="font-semibold text-sm">{fil.nombre}</span>
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium border ${MATERIAL_COLORS[fil.material]}`}>
              {fil.material}
            </span>
            {fil.tipo && fil.tipo !== 'Común' && (
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border">{fil.tipo}</span>
            )}
            {fil.color && <span className="text-xs text-muted-foreground">{fil.color}</span>}
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

          {/* Imágenes del filamento (hasta 3) */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-2">
              Fotos del filamento <span className="font-normal">(hasta 3)</span>
            </label>
            <div className="flex gap-3 flex-wrap">
              {([1, 2, 3] as const).map((slot) => {
                const url = imgUrls[slot - 1]
                const loading = uploadingSlot === slot
                return (
                  <div key={slot} className="flex flex-col items-center gap-1.5">
                    <div className="relative group">
                      {url ? (
                        <img src={url} alt="" className="w-20 h-20 rounded-xl object-cover border border-border" />
                      ) : (
                        <div className="w-20 h-20 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center text-muted-foreground/40 gap-1">
                          <ImageIcon size={18} />
                          <span className="text-[10px]">Foto {slot}</span>
                        </div>
                      )}
                      {loading && (
                        <div className="absolute inset-0 rounded-xl bg-black/30 flex items-center justify-center">
                          <Loader2 size={16} className="animate-spin text-white" />
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => imgRefs[slot - 1].current?.click()}
                      disabled={loading}
                      className="text-[10px] px-2 py-1 rounded border border-border hover:bg-secondary transition-colors disabled:opacity-50"
                    >
                      {url ? 'Cambiar' : '+ Subir'}
                    </button>
                    {url && (
                      <button
                        type="button"
                        onClick={() => handleImageRemove(slot)}
                        className="text-[10px] text-muted-foreground hover:text-red-500 transition-colors"
                      >
                        Quitar
                      </button>
                    )}
                    <input
                      ref={imgRefs[slot - 1]}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f, slot) }}
                    />
                  </div>
                )
              })}
            </div>
          </div>

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

          {/* Marca y Tipo */}
          <div className="grid grid-cols-2 gap-3">
            <div className="relative">
              <label className="text-xs font-medium text-muted-foreground block mb-2">Marca</label>
              <input
                value={marcaInput}
                onChange={(e) => { setMarcaInput(e.target.value); setShowMarcaSugs(true) }}
                onFocus={() => setShowMarcaSugs(true)}
                onBlur={() => { setTimeout(() => setShowMarcaSugs(false), 150); saveMarca() }}
                onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                placeholder="GST3D, Fremover..."
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
              />
              {showMarcaSugs && (
                <div className="absolute z-10 top-full mt-1 w-full bg-card border border-border rounded-lg shadow-lg overflow-hidden">
                  {[...MARCAS_SUGERIDAS.filter(m => !marcaInput || m.toLowerCase().includes(marcaInput.toLowerCase()))].map((m) => (
                    <button key={m} type="button" onMouseDown={() => { setMarcaInput(m); setShowMarcaSugs(false); setTimeout(saveMarca, 50) }}
                      className="w-full text-left px-3 py-1.5 text-sm hover:bg-secondary transition-colors">
                      {m}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-2">Tipo</label>
              <select
                value={tipoInput}
                onChange={(e) => saveTipo(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
              >
                {TIPOS_FILAMENTO.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
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
            {!showVenta && !showUsoPropio && !showCompra && (
              <>
                <button
                  onClick={() => setShowVenta(true)}
                  disabled={totalGr <= 0}
                  className="flex items-center gap-2 text-sm font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-40 px-4 py-2 rounded-lg transition-colors"
                >
                  <ShoppingBag size={14} /> Vender
                </button>
                <button
                  onClick={() => setShowUsoPropio(true)}
                  disabled={totalGr <= 0}
                  className="flex items-center gap-2 text-sm font-medium border border-border hover:bg-secondary disabled:opacity-40 px-4 py-2 rounded-lg transition-colors"
                >
                  <Minus size={14} /> Uso propio
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

          {/* ── Formulario uso propio ── */}
          {showUsoPropio && (
            <div className="bg-secondary/20 border border-border rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold">Uso propio — descontar del stock</p>
                <button onClick={() => { setShowUsoPropio(false); setUsoPropioError('') }} className="text-muted-foreground hover:text-foreground">
                  <X size={14} />
                </button>
              </div>
              {usoPropioError && <p className="text-xs text-red-500">{usoPropioError}</p>}
              <div className="flex items-center gap-2">
                <input
                  type="number" min="1" max={totalGr} placeholder="0" autoFocus
                  value={usoPropioGr}
                  onChange={(e) => setUsoPropioGr(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleUsoPropioConfirmar()}
                  className="w-32 text-sm border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-foreground/20"
                />
                <span className="text-sm text-muted-foreground">g</span>
                <span className="text-xs text-muted-foreground">(disponible: {fmtGr(totalGr)})</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setShowUsoPropio(false); setUsoPropioError('') }}
                  className="flex-1 text-sm border border-border rounded-lg py-1.5 hover:bg-secondary transition-colors">
                  Cancelar
                </button>
                <button onClick={handleUsoPropioConfirmar} disabled={isPending}
                  className="flex-1 text-sm bg-foreground text-background rounded-lg py-1.5 hover:opacity-90 disabled:opacity-50 transition-opacity">
                  {isPending ? 'Guardando...' : 'Descontar'}
                </button>
              </div>
            </div>
          )}

          {/* ── Formulario venta ── */}
          {showVenta && (
            <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-green-800 dark:text-green-300">Registrar venta</p>
                <button onClick={() => { setShowVenta(false); setVentaError('') }} className="text-muted-foreground hover:text-foreground">
                  <X size={14} />
                </button>
              </div>
              {ventaError && <p className="text-xs text-red-500">{ventaError}</p>}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Cantidad</label>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setVentaKg(Math.max(1, ventaKg - 1))}
                      className="w-8 h-8 flex items-center justify-center rounded-lg border border-border hover:bg-secondary transition-colors text-sm font-bold">−</button>
                    <span className="text-xl font-bold w-12 text-center tabular-nums">{ventaKg}</span>
                    <button type="button" onClick={() => setVentaKg(ventaKg + 1)}
                      disabled={ventaKg * 1000 >= totalGr}
                      className="w-8 h-8 flex items-center justify-center rounded-lg border border-border hover:bg-secondary disabled:opacity-30 transition-colors text-sm font-bold">+</button>
                    <span className="text-xs text-muted-foreground">kg</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Disp: {Math.floor(totalGr / 1000)} kg</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Precio ($/kg)</label>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">$</span>
                    <input type="number" min="0"
                      value={ventaPrecioKg}
                      onChange={(e) => setVentaPrecioKg(e.target.value)}
                      className="w-full text-sm border border-border rounded-lg px-2.5 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-green-400/40" />
                  </div>
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-muted-foreground block mb-1">Cliente</label>
                  {ventaClienteId ? (
                    <div className="flex items-center gap-2 border border-green-400/50 bg-green-50 dark:bg-green-950/30 rounded-lg px-2.5 py-1.5">
                      <span className="text-sm flex-1 truncate font-medium">{ventaCliente}</span>
                      {ventaClienteKgMes !== null && (
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          ya compró {ventaClienteKgMes.toFixed(1)} kg este mes
                        </span>
                      )}
                      <button type="button" onClick={clearCliente} className="text-muted-foreground hover:text-foreground">
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <input
                        placeholder="Buscar cliente..."
                        value={ventaClienteSearch}
                        onChange={(e) => setVentaClienteSearch(e.target.value)}
                        className="w-full text-sm border border-border rounded-lg px-2.5 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-green-400/40"
                      />
                      {ventaClienteSearch.length >= 1 && (
                        <div className="absolute z-20 top-full left-0 right-0 mt-0.5 bg-card border border-border rounded-lg shadow-lg max-h-44 overflow-y-auto">
                          {clientesLocal
                            .filter(c => c.nombre.toLowerCase().includes(ventaClienteSearch.toLowerCase()) || (c.dni ?? '').includes(ventaClienteSearch))
                            .slice(0, 7)
                            .map(c => (
                              <button key={c.id} type="button"
                                className="w-full text-left px-3 py-2 text-sm hover:bg-secondary transition-colors flex items-center justify-between gap-2"
                                onClick={() => onClienteSelect(c)}
                              >
                                <span>{c.nombre}</span>
                                {c.dni && <span className="text-[10px] text-muted-foreground font-mono">DNI {c.dni}</span>}
                              </button>
                            ))
                          }
                          {clientesLocal.filter(c => c.nombre.toLowerCase().includes(ventaClienteSearch.toLowerCase()) || (c.dni ?? '').includes(ventaClienteSearch)).length === 0 && (
                            <p className="px-3 py-2 text-xs text-muted-foreground">Sin resultados</p>
                          )}
                          <button type="button"
                            className="w-full text-left px-3 py-2 text-xs text-blue-600 dark:text-blue-400 hover:bg-secondary border-t border-border transition-colors flex items-center gap-1.5"
                            onClick={() => { setShowNuevoCliente(true); setNuevoClienteNombre(ventaClienteSearch) }}
                          >
                            <Plus size={11} /> Crear cliente nuevo
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Fecha</label>
                  <input type="date" value={ventaFecha}
                    onChange={async (e) => {
                      const fecha = e.target.value
                      setVentaFecha(fecha)
                      if (ventaClienteId) {
                        const kg = await getKgMensualesCliente(ventaClienteId, fecha.slice(0, 7))
                        setVentaClienteKgMes(kg)
                        setVentaPrecioKg(String(tierPrecio(kg + ventaKgNum)))
                      }
                    }}
                    className="w-full text-sm border border-border rounded-lg px-2.5 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-green-400/40" />
                </div>
              </div>

              {/* Mini-form nuevo cliente */}
              {showNuevoCliente && (
                <div className="rounded-lg border border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/40 p-3 space-y-2">
                  <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">Nuevo cliente</p>
                  {nuevoClienteError && <p className="text-xs text-red-500">{nuevoClienteError}</p>}
                  <input
                    autoFocus
                    placeholder="Nombre completo *"
                    value={nuevoClienteNombre}
                    onChange={e => setNuevoClienteNombre(e.target.value)}
                    className="w-full text-sm border border-border rounded-lg px-2.5 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-blue-400/40"
                  />
                  <input
                    placeholder="DNI (opcional)"
                    value={nuevoClienteDni}
                    onChange={e => setNuevoClienteDni(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleCrearCliente()}
                    className="w-full text-sm border border-border rounded-lg px-2.5 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-blue-400/40"
                  />
                  <div className="flex gap-2">
                    <button type="button" onClick={() => { setShowNuevoCliente(false); setNuevoClienteError('') }}
                      className="flex-1 text-xs border border-border rounded-lg py-1.5 hover:bg-secondary transition-colors">
                      Cancelar
                    </button>
                    <button type="button" onClick={handleCrearCliente} disabled={isPending}
                      className="flex-1 text-xs bg-blue-600 text-white rounded-lg py-1.5 hover:bg-blue-700 disabled:opacity-50 transition-colors">
                      Guardar y seleccionar
                    </button>
                  </div>
                </div>
              )}

              {/* Banner tier de precio por cliente */}
              {ventaClienteId && ventaClienteKgMes !== null && (
                <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 px-3 py-2.5 space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                      Escala mensual — {ventaCliente}
                    </p>
                    <span className="text-[10px] text-blue-600 dark:text-blue-400 font-mono">
                      {ventaClienteKgMes.toFixed(0)} kg anteriores + {ventaKgNum} kg = {kgMesAcum.toFixed(0)} kg este mes
                    </span>
                  </div>
                  {/* Barra de progreso de tiers */}
                  <div className="space-y-1">
                    {[...PRECIO_TIERS].reverse().map((t, i, arr) => {
                      const nextTier = arr[i + 1]
                      const max = nextTier ? nextTier.min : t.min + 5
                      const from = t.min
                      const active = tierSugerido === t.precio
                      const pct = Math.min(100, Math.max(0, ((kgMesAcum - from) / (max - from)) * 100))
                      const llegó = kgMesAcum >= from
                      return (
                        <div key={t.min} className={`rounded-md px-2 py-1.5 border ${active ? 'border-blue-500 bg-blue-100 dark:bg-blue-900/40' : 'border-border bg-secondary/30'}`}>
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-[10px] font-semibold ${active ? 'text-blue-700 dark:text-blue-300' : llegó ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                              {t.min === 0 ? 'Precio público' : `${t.min}+ kg`} {active && '← actual'}
                            </span>
                            <span className={`text-[10px] font-mono font-bold ${active ? 'text-blue-700 dark:text-blue-300' : 'text-muted-foreground'}`}>
                              ${(t.precio / 1000).toFixed(0)}k/kg
                            </span>
                          </div>
                          {active && max && (
                            <div className="h-1 bg-blue-200 dark:bg-blue-800 rounded-full overflow-hidden">
                              <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  {tierSugerido !== ventaPrecioKgNum && (
                    <button type="button"
                      className="text-[10px] text-blue-600 dark:text-blue-400 underline w-full text-left"
                      onClick={() => setVentaPrecioKg(String(tierSugerido))}
                    >
                      ↳ Aplicar precio de escala: ${(tierSugerido / 1000).toFixed(0)}k/kg
                    </button>
                  )}
                </div>
              )}

              {/* Preview ganancia */}
              {ventaKgNum > 0 && (
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

// ── Modal de venta global (multi-filamento) ────────────────────────────────────

type ItemVenta = { filamentoId: string; kg: number }

function VentaGlobalModal({
  filamentos,
  clientes,
  onClose,
  onVendido,
}: {
  filamentos: Filamento[]
  clientes: ClienteBasic[]
  onClose: () => void
  onVendido: (updated: Filamento[]) => void
}) {
  const today = new Date().toISOString().split('T')[0]
  const [isPending, startTransition] = useTransition()

  // Cliente
  const [clienteId, setClienteId] = useState<string | null>(null)
  const [clienteNombre, setClienteNombre] = useState('')
  const [clienteSearch, setClienteSearch] = useState('')
  const [clienteKgMes, setClienteKgMes] = useState<number | null>(null)
  const [showNuevoCliente, setShowNuevoCliente] = useState(false)
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [nuevoDni, setNuevoDni] = useState('')
  const [nuevoTelefono, setNuevoTelefono] = useState('')
  const [nuevoClienteErr, setNuevoClienteErr] = useState('')
  const [clientesLocal, setClientesLocal] = useState(clientes)

  // Items
  const [items, setItems] = useState<ItemVenta[]>([{ filamentoId: '', kg: 1 }])
  const [fecha, setFecha] = useState(today)
  const [error, setError] = useState('')

  // Precio override (amigos / excepciones)
  const [precioOverride, setPrecioOverride] = useState<number | null>(null)
  const [showOverride, setShowOverride] = useState(false)
  const [overrideInput, setOverrideInput] = useState('')

  const [openDropIdx, setOpenDropIdx] = useState<number | null>(null)

  const filamentosConStock = [...filamentos.filter(f => totalGramos(f) >= 1000)]
    .sort((a, b) => totalGramos(b) - totalGramos(a))

  const totalKgVenta = items.reduce((s, i) => s + (i.kg || 0), 0)
  const kgMesTotal = (clienteKgMes ?? 0) + totalKgVenta
  const tier = tierPrecio(kgMesTotal)
  const precioKg = precioOverride ?? tier

  async function onClienteSelect(c: ClienteBasic) {
    setClienteId(c.id)
    setClienteNombre(c.nombre)
    setClienteSearch(c.nombre)
    setClienteKgMes(null)
    const kg = await getKgMensualesCliente(c.id, fecha.slice(0, 7))
    setClienteKgMes(kg)
  }

  function clearCliente() {
    setClienteId(null)
    setClienteNombre('')
    setClienteSearch('')
    setClienteKgMes(null)
  }

  async function handleCrearCliente() {
    if (!nuevoNombre.trim()) { setNuevoClienteErr('El nombre es requerido'); return }
    setNuevoClienteErr('')
    const res = await createClienteRapido(nuevoNombre.trim(), nuevoDni.trim() || undefined, nuevoTelefono.trim() || undefined)
    if ('error' in res) { setNuevoClienteErr(res.error); return }
    const nuevo: ClienteBasic = { id: res.id, nombre: res.nombre, dni: res.dni, telefono: res.telefono, email: null, direccion: null }
    setClientesLocal(prev => [...prev, nuevo].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')))
    setShowNuevoCliente(false)
    setNuevoNombre(''); setNuevoDni(''); setNuevoTelefono('')
    await onClienteSelect(nuevo)
  }

  function addItem() {
    setItems(prev => [...prev, { filamentoId: '', kg: 1 }])
  }

  function removeItem(idx: number) {
    setItems(prev => prev.filter((_, i) => i !== idx))
  }

  function updateItem(idx: number, field: keyof ItemVenta, value: string | number) {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item))
  }

  function stockDisp(filId: string): number {
    const f = filamentos.find(f => f.id === filId)
    return f ? Math.floor(totalGramos(f) / 1000) : 0
  }

  function handleConfirmar() {
    if (!clienteId) { setError('Seleccioná un cliente'); return }
    const validos = items.filter(i => i.filamentoId && i.kg > 0)
    if (!validos.length) { setError('Agregá al menos un filamento'); return }
    for (const item of validos) {
      if (item.kg > stockDisp(item.filamentoId)) { setError('Stock insuficiente en algún filamento'); return }
    }
    setError('')
    startTransition(async () => {
      const updated: Filamento[] = []
      for (const item of validos) {
        const res = await registrarVentaFilamento(item.filamentoId, {
          gramos: item.kg * 1000,
          precio_kg: precioKg,
          costo_kg: filamentos.find(f => f.id === item.filamentoId)?.costo_kg ?? 0,
          cliente: clienteNombre,
          cliente_id: clienteId,
          nota: '',
          fecha,
        })
        if (res.filamento) updated.push(res.filamento)
      }
      onVendido(updated)
    })
  }

  const totalVenta = totalKgVenta * precioKg
  const totalCosto = items.reduce((s, i) => {
    const f = filamentos.find(f => f.id === i.filamentoId)
    return s + (f?.costo_kg ?? 0) * i.kg
  }, 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-card border-b border-border px-5 py-4 flex items-center justify-between">
          <h2 className="text-base font-bold">Nueva venta de filamento</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-5">
          {/* ── Cliente ── */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground block mb-2">Cliente</label>
            {clienteId ? (
              <div className="flex items-center gap-2 border border-green-400/50 bg-green-50 dark:bg-green-950/30 rounded-lg px-3 py-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{clienteNombre}</p>
                  {clienteKgMes !== null && (
                    <p className="text-[10px] text-muted-foreground">Ya compró {clienteKgMes.toFixed(0)} kg este mes</p>
                  )}
                </div>
                <button onClick={clearCliente} className="text-muted-foreground hover:text-foreground shrink-0"><X size={14} /></button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <input
                    autoFocus
                    placeholder="Buscar por nombre o DNI..."
                    value={clienteSearch}
                    onChange={e => setClienteSearch(e.target.value)}
                    className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-green-400/40"
                  />
                  {clienteSearch.length >= 1 && (
                    <div className="absolute z-20 top-full left-0 right-0 mt-0.5 bg-card border border-border rounded-lg shadow-lg max-h-44 overflow-y-auto">
                      {clientesLocal
                        .filter(c => c.nombre.toLowerCase().includes(clienteSearch.toLowerCase()) || (c.dni ?? '').includes(clienteSearch))
                        .slice(0, 7)
                        .map(c => (
                          <button key={c.id} type="button"
                            className="w-full text-left px-3 py-2 text-sm hover:bg-secondary transition-colors flex items-center justify-between gap-2"
                            onClick={() => onClienteSelect(c)}
                          >
                            <span>{c.nombre}</span>
                            {c.dni && <span className="text-[10px] text-muted-foreground font-mono">DNI {c.dni}</span>}
                          </button>
                        ))
                      }
                      <button type="button"
                        className="w-full text-left px-3 py-2 text-xs text-blue-600 dark:text-blue-400 hover:bg-secondary border-t border-border transition-colors flex items-center gap-1.5"
                        onClick={() => { setShowNuevoCliente(true); setNuevoNombre(clienteSearch) }}
                      >
                        <Plus size={11} /> Crear cliente nuevo
                      </button>
                    </div>
                  )}
                </div>
                {showNuevoCliente && (
                  <div className="rounded-lg border border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/40 p-3 space-y-2">
                    <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">Nuevo cliente</p>
                    {nuevoClienteErr && <p className="text-xs text-red-500">{nuevoClienteErr}</p>}
                    <input autoFocus placeholder="Nombre completo *" value={nuevoNombre}
                      onChange={e => setNuevoNombre(e.target.value)}
                      className="w-full text-sm border border-border rounded-lg px-2.5 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-blue-400/40" />
                    <div className="grid grid-cols-2 gap-2">
                      <input placeholder="DNI (opcional)" value={nuevoDni}
                        onChange={e => setNuevoDni(e.target.value)}
                        className="text-sm border border-border rounded-lg px-2.5 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-blue-400/40" />
                      <input placeholder="Teléfono (opcional)" value={nuevoTelefono}
                        onChange={e => setNuevoTelefono(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleCrearCliente()}
                        className="text-sm border border-border rounded-lg px-2.5 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-blue-400/40" />
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => { setShowNuevoCliente(false); setNuevoClienteErr('') }}
                        className="flex-1 text-xs border border-border rounded-lg py-1.5 hover:bg-secondary transition-colors">Cancelar</button>
                      <button type="button" onClick={handleCrearCliente}
                        className="flex-1 text-xs bg-blue-600 text-white rounded-lg py-1.5 hover:bg-blue-700 transition-colors">Guardar y seleccionar</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Filamentos ── */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground block mb-2">Filamentos</label>
            <div className="space-y-2">
              {items.map((item, idx) => {
                const selFil = filamentosConStock.find(f => f.id === item.filamentoId)
                return (
                <div key={idx} className="flex items-center gap-2">
                  {/* Dropdown custom con círculo de color */}
                  <div className="relative flex-1 min-w-0">
                    <button
                      type="button"
                      onClick={() => setOpenDropIdx(openDropIdx === idx ? null : idx)}
                      className="w-full flex items-center gap-2 text-sm border border-border rounded-lg px-2.5 py-2 bg-background hover:bg-secondary/50 transition-colors text-left"
                    >
                      {selFil ? (
                        <>
                          <span className="w-4 h-4 rounded-full shrink-0 border border-black/10"
                            style={{ backgroundColor: colorToCss(selFil.color) }} />
                          <span className="truncate flex-1">{selFil.color} — {selFil.material} · {selFil.marca} {shortNombre(selFil.nombre)}</span>
                          <span className="text-[10px] text-muted-foreground shrink-0">{selFil.rollos_cerrados} rol</span>
                        </>
                      ) : (
                        <span className="text-muted-foreground flex-1">— Seleccionar filamento —</span>
                      )}
                      <ChevronDown size={12} className="text-muted-foreground shrink-0" />
                    </button>
                    {openDropIdx === idx && (
                      <div className="absolute z-30 top-full left-0 right-0 mt-0.5 bg-card border border-border rounded-lg shadow-xl max-h-56 overflow-y-auto">
                        {filamentosConStock.map(f => (
                          <button
                            key={f.id}
                            type="button"
                            className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-secondary transition-colors text-left ${item.filamentoId === f.id ? 'bg-secondary/60' : ''}`}
                            onClick={() => { updateItem(idx, 'filamentoId', f.id); setOpenDropIdx(null) }}
                          >
                            <span className="w-4 h-4 rounded-full shrink-0 border border-black/10"
                              style={{ backgroundColor: colorToCss(f.color) }} />
                            <span className="flex-1 min-w-0">
                              <span className="block truncate font-medium">{f.color} — {f.material}</span>
                              <span className="text-[10px] text-muted-foreground">{f.marca} {shortNombre(f.nombre)}</span>
                            </span>
                            <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                              {f.rollos_cerrados > 0 && `${f.rollos_cerrados} rol`}
                              {f.rollos_cerrados > 0 && f.gramos_sueltos > 0 && ' + '}
                              {f.gramos_sueltos > 0 && `${f.gramos_sueltos}g`}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button type="button" onClick={() => updateItem(idx, 'kg', Math.max(1, item.kg - 1))}
                      className="w-7 h-7 flex items-center justify-center rounded border border-border hover:bg-secondary text-sm font-bold">−</button>
                    <span className="w-8 text-center text-sm font-mono font-bold">{item.kg}</span>
                    <button type="button"
                      onClick={() => updateItem(idx, 'kg', Math.min(stockDisp(item.filamentoId) || 99, item.kg + 1))}
                      className="w-7 h-7 flex items-center justify-center rounded border border-border hover:bg-secondary text-sm font-bold">+</button>
                    <span className="text-xs text-muted-foreground w-4">kg</span>
                  </div>
                  {items.length > 1 && (
                    <button type="button" onClick={() => removeItem(idx)} className="text-muted-foreground hover:text-red-500 shrink-0">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              )})}
              <button type="button" onClick={addItem}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <Plus size={12} /> Agregar otro filamento
              </button>
            </div>
          </div>

          {/* ── Escala de precio ── */}
          {clienteId && clienteKgMes !== null && totalKgVenta > 0 && (
            <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 px-3 py-2.5 space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">Precio por escala mensual</p>
                <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400">
                  {clienteKgMes.toFixed(0)} kg previos + {totalKgVenta} kg = {kgMesTotal.toFixed(0)} kg
                </span>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {[...PRECIO_TIERS].map(t => (
                  <span key={t.min} className={`text-[10px] px-2 py-0.5 rounded-full font-mono border ${
                    tier === t.precio ? 'bg-blue-600 text-white border-blue-600' : 'text-muted-foreground border-border'
                  }`}>
                    {t.min === 0 ? '<5' : `${t.min}+`} kg → ${(t.precio / 1000).toFixed(0)}k
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* ── Fecha + resumen ── */}
          <div className="grid grid-cols-2 gap-3 items-end">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Fecha</label>
              <input type="date" value={fecha}
                onChange={async e => {
                  setFecha(e.target.value)
                  if (clienteId) {
                    const kg = await getKgMensualesCliente(clienteId, e.target.value.slice(0, 7))
                    setClienteKgMes(kg)
                  }
                }}
                className="w-full text-sm border border-border rounded-lg px-2.5 py-2 bg-background focus:outline-none" />
            </div>
            {totalKgVenta > 0 && (
              <div className="bg-secondary/40 rounded-lg p-2.5 space-y-0.5 text-right">
                <p className="text-[10px] text-muted-foreground">{totalKgVenta} kg · ${(precioKg / 1000).toFixed(0)}k/kg</p>
                <p className="text-sm font-bold">{fmtARS(totalVenta)}</p>
                <p className="text-[10px] text-green-600 dark:text-green-400">
                  Ganancia {fmtARS(totalVenta - totalCosto)}
                </p>
              </div>
            )}
          </div>

          {/* ── Precio especial (override) ── */}
          <div className="border border-border rounded-lg p-3 space-y-2">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={showOverride}
                onChange={e => {
                  setShowOverride(e.target.checked)
                  if (!e.target.checked) { setPrecioOverride(null); setOverrideInput('') }
                }}
                className="w-3.5 h-3.5 accent-orange-500"
              />
              <span className="text-xs font-medium">Precio especial (amigo / excepción)</span>
              {precioOverride && (
                <span className="text-[10px] bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 px-1.5 py-0.5 rounded-full font-mono">
                  ${(precioOverride / 1000).toFixed(0)}k/kg
                </span>
              )}
            </label>
            {showOverride && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Precio/kg $</span>
                <input
                  type="number" min="0" placeholder="ej: 20000"
                  value={overrideInput}
                  onChange={e => {
                    setOverrideInput(e.target.value)
                    const v = parseFloat(e.target.value)
                    setPrecioOverride(v > 0 ? v : null)
                  }}
                  className="w-28 text-sm border border-orange-300 dark:border-orange-700 rounded-lg px-2.5 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-orange-400/40"
                />
                <span className="text-[10px] text-muted-foreground">(normal: ${(tier / 1000).toFixed(0)}k)</span>
              </div>
            )}
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button onClick={onClose}
              className="flex-1 text-sm border border-border rounded-lg py-2 hover:bg-secondary transition-colors">
              Cancelar
            </button>
            <button onClick={handleConfirmar} disabled={isPending}
              className="flex-1 text-sm bg-green-600 text-white rounded-lg py-2 hover:bg-green-700 disabled:opacity-50 transition-colors font-medium">
              {isPending ? 'Registrando...' : `Confirmar venta · ${fmtARS(totalVenta)}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Tab Clientes ──────────────────────────────────────────────────────────────

function ClientesFilamentoTab({ clientes }: { clientes: ClienteBasic[] }) {
  const [stats, setStats] = useState<ClienteFilamentoStats[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [ventasCliente, setVentasCliente] = useState<Record<string, VentaFilamento[]>>({})
  const [loadingVentas, setLoadingVentas] = useState<Record<string, boolean>>({})
  const [editId, setEditId] = useState<string | null>(null)
  const [editNombre, setEditNombre] = useState('')
  const [editDni, setEditDni] = useState('')
  const [editTel, setEditTel] = useState('')
  const [editError, setEditError] = useState('')
  const [, startTransition] = useTransition()

  useEffect(() => {
    setLoading(true)
    getClientesConVentasFilamento().then(data => { setStats(data); setLoading(false) })
  }, [])

  const lista = (stats ?? []).filter(c =>
    c.nombre.toLowerCase().includes(search.toLowerCase()) ||
    (c.dni ?? '').includes(search) ||
    (c.telefono ?? '').includes(search)
  )

  async function toggleExpand(id: string) {
    if (expandedId === id) { setExpandedId(null); return }
    setExpandedId(id)
    if (!ventasCliente[id]) {
      setLoadingVentas(p => ({ ...p, [id]: true }))
      const data = await getVentasDeCliente(id)
      setVentasCliente(p => ({ ...p, [id]: data }))
      setLoadingVentas(p => ({ ...p, [id]: false }))
    }
  }

  function startEdit(c: ClienteFilamentoStats) {
    setEditId(c.id); setEditNombre(c.nombre); setEditDni(c.dni ?? ''); setEditTel(c.telefono ?? ''); setEditError('')
  }

  function saveEdit(id: string) {
    if (!editNombre.trim()) { setEditError('El nombre es requerido'); return }
    setEditError('')
    startTransition(async () => {
      const res = await updateClienteBasico(id, { nombre: editNombre.trim(), dni: editDni.trim() || null, telefono: editTel.trim() || null })
      if (res.error) { setEditError(res.error); return }
      setStats(prev => prev ? prev.map(c => c.id === id ? { ...c, nombre: editNombre.trim(), dni: editDni.trim() || null, telefono: editTel.trim() || null } : c) : prev)
      setEditId(null)
    })
  }

  return (
    <div className="space-y-4">
      <input
        placeholder="Buscar por nombre, DNI o teléfono..."
        value={search} onChange={e => setSearch(e.target.value)}
        className="w-full text-sm border border-border rounded-xl px-4 py-2.5 bg-card focus:outline-none focus:ring-2 focus:ring-blue-400/40"
      />
      {loading && <p className="text-sm text-muted-foreground py-4 text-center">Cargando clientes...</p>}
      {!loading && lista.length === 0 && (
        <p className="text-sm text-muted-foreground py-4 text-center">
          {search ? 'Sin resultados' : 'Todavía no hay ventas de filamento registradas con cliente.'}
        </p>
      )}
      <div className="space-y-2">
        {lista.map(c => (
          <div key={c.id} className="bg-card border border-border rounded-xl overflow-hidden">
            {/* Fila cliente */}
            {editId === c.id ? (
              <div className="p-4 space-y-2">
                {editError && <p className="text-xs text-red-500">{editError}</p>}
                <input value={editNombre} onChange={e => setEditNombre(e.target.value)} placeholder="Nombre *"
                  className="w-full text-sm border border-border rounded-lg px-2.5 py-1.5 bg-background focus:outline-none" />
                <div className="grid grid-cols-2 gap-2">
                  <input value={editDni} onChange={e => setEditDni(e.target.value)} placeholder="DNI"
                    className="text-sm border border-border rounded-lg px-2.5 py-1.5 bg-background focus:outline-none" />
                  <input value={editTel} onChange={e => setEditTel(e.target.value)} placeholder="Teléfono"
                    className="text-sm border border-border rounded-lg px-2.5 py-1.5 bg-background focus:outline-none" />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setEditId(null)} className="flex-1 text-xs border border-border rounded-lg py-1.5 hover:bg-secondary transition-colors">Cancelar</button>
                  <button onClick={() => saveEdit(c.id)} className="flex-1 text-xs bg-foreground text-background rounded-lg py-1.5 hover:opacity-90 transition-opacity">Guardar</button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-blue-700 dark:text-blue-300">{c.nombre.charAt(0).toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold truncate">{c.nombre}</p>
                    {c.dni && <span className="text-[10px] text-muted-foreground font-mono bg-secondary px-1.5 py-0.5 rounded">DNI {c.dni}</span>}
                    {c.telefono && <span className="text-[10px] text-muted-foreground">📱 {c.telefono}</span>}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {c.cantVentas} {c.cantVentas === 1 ? 'compra' : 'compras'} · {c.totalKg.toFixed(1)} kg · {fmtARS(c.totalVentas)}
                    {c.ultimaCompra && ` · última: ${c.ultimaCompra}`}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => startEdit(c)}
                    className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground transition-colors" title="Editar">
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => toggleExpand(c.id)}
                    className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground transition-colors" title="Ver historial">
                    {expandedId === c.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                </div>
              </div>
            )}
            {/* Historial expandido */}
            {expandedId === c.id && (
              <div className="border-t border-border bg-secondary/20 divide-y divide-border">
                {loadingVentas[c.id] && <p className="text-xs text-muted-foreground px-4 py-3">Cargando...</p>}
                {!loadingVentas[c.id] && (ventasCliente[c.id] ?? []).length === 0 && (
                  <p className="text-xs text-muted-foreground px-4 py-3">Sin ventas registradas.</p>
                )}
                {(ventasCliente[c.id] ?? []).map(v => (
                  <div key={v.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">
                        {v.filamento_color} — {v.filamento_material}{v.filamento_marca && ` · ${v.filamento_marca} ${shortNombre(v.filamento_nombre ?? '')}`}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{v.fecha} · {(v.gramos / 1000).toFixed(1)} kg · ${(v.precio_kg / 1000).toFixed(0)}k/kg</p>
                    </div>
                    <span className="text-sm font-mono font-semibold shrink-0 text-green-600 dark:text-green-400">
                      {fmtARS((v.gramos / 1000) * v.precio_kg)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Tab Pedidos Web ────────────────────────────────────────────────────────────

function PedidosPendientesTab() {
  const [pedidos, setPedidos] = useState<FilamentoPedido[]>([])
  const [loading, setLoading] = useState(true)
  const [subtab, setSubtab] = useState<'pendiente' | 'confirmado' | 'cancelado'>('pendiente')
  const [procesando, setProcesando] = useState<string | null>(null)
  const [expandido, setExpandido] = useState<string | null>(null)
  const [notaModal, setNotaModal] = useState<{ id: string; accion: 'confirmar' | 'cancelar' } | null>(null)
  const [notaTexto, setNotaTexto] = useState('')
  const [error, setError] = useState('')
  const [, startTransition] = useTransition()

  useEffect(() => {
    getFilamentoPedidos().then((data) => {
      setPedidos(data)
      setLoading(false)
    })
  }, [])

  const lista = pedidos.filter(p => p.estado === subtab)

  function fmtFecha(d: string) {
    return new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
  }

  function handleAccion(id: string, accion: 'confirmar' | 'cancelar') {
    setNotaModal({ id, accion })
    setNotaTexto('')
    setError('')
  }

  function ejecutarAccion() {
    if (!notaModal) return
    const { id, accion } = notaModal
    setNotaModal(null)
    setProcesando(id)
    setError('')
    startTransition(async () => {
      let result: { error?: string }
      if (accion === 'confirmar') {
        result = await confirmarPedidoYDescontarStock(id, notaTexto || undefined)
      } else {
        result = await updateEstadoPedidoFilamento(id, 'cancelado', notaTexto || undefined)
      }
      if (result.error) {
        setError(result.error)
        setProcesando(null)
        return
      }
      // Actualizar localmente
      const nuevoEstado = accion === 'confirmar' ? 'confirmado' : 'cancelado'
      setPedidos(prev => prev.map(p => p.id === id ? { ...p, estado: nuevoEstado as FilamentoPedido['estado'], nota: notaTexto || p.nota } : p))
      setProcesando(null)
      setSubtab(nuevoEstado as 'confirmado' | 'cancelado')
    })
  }

  function marcarEntregado(id: string) {
    setProcesando(id)
    startTransition(async () => {
      await updateEstadoPedidoFilamento(id, 'entregado')
      setPedidos(prev => prev.filter(p => p.id !== id))
      setProcesando(null)
    })
  }

  return (
    <div className="space-y-4">
      {/* Subtabs */}
      <div className="flex gap-2 flex-wrap">
        {(['pendiente', 'confirmado', 'cancelado'] as const).map((st) => {
          const count = pedidos.filter(p => p.estado === st).length
          const colors: Record<string, string> = {
            pendiente: 'bg-yellow-500 text-white border-yellow-500',
            confirmado: 'bg-green-600 text-white border-green-600',
            cancelado: 'bg-secondary text-muted-foreground border-border',
          }
          const inactiveHover: Record<string, string> = {
            pendiente: 'hover:border-yellow-400',
            confirmado: 'hover:border-green-400',
            cancelado: 'hover:border-border',
          }
          return (
            <button
              key={st}
              onClick={() => setSubtab(st)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors capitalize ${
                subtab === st ? colors[st] : `border-border text-muted-foreground ${inactiveHover[st]}`
              }`}
            >
              {st === 'pendiente' && <Clock size={13} />}
              {st === 'confirmado' && <CheckCircle2 size={13} />}
              {st === 'cancelado' && <X size={13} />}
              {st.charAt(0).toUpperCase() + st.slice(1)}
              {count > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${subtab === st ? 'bg-white/20' : 'bg-secondary'}`}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-sm text-red-700 dark:text-red-400">
          <AlertCircle size={15} className="shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {loading && (
        <div className="text-center py-12 text-muted-foreground text-sm">Cargando pedidos...</div>
      )}

      {!loading && lista.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-3xl mb-3">{subtab === 'pendiente' ? '📭' : subtab === 'confirmado' ? '✅' : '🚫'}</p>
          <p className="font-medium">No hay pedidos {subtab === 'pendiente' ? 'pendientes' : subtab === 'confirmado' ? 'confirmados' : 'cancelados'}</p>
        </div>
      )}

      <div className="space-y-3">
        {lista.map((p) => {
          const isExpanded = expandido === p.id
          const isProcesando = procesando === p.id
          return (
            <div key={p.id} className={`bg-card border rounded-xl overflow-hidden transition-all ${
              p.estado === 'pendiente' ? 'border-yellow-300 dark:border-yellow-700' : 'border-border'
            }`}>
              {/* Header del pedido */}
              <button
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-secondary/30 transition-colors"
                onClick={() => setExpandido(isExpanded ? null : p.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm">N° {p.numero}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      p.estado === 'pendiente' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                      : p.estado === 'confirmado' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                      : 'bg-secondary text-muted-foreground'
                    }`}>
                      {p.estado}
                    </span>
                    <span className="text-sm font-semibold">{p.cliente_nombre}</span>
                    {p.cliente_telefono && (
                      <a
                        href={`https://wa.me/${p.cliente_telefono.replace(/\D/g, '')}`}
                        target="_blank" rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="flex items-center gap-1 text-[10px] text-green-600 dark:text-green-400 hover:underline"
                      >
                        <Phone size={10} />
                        {p.cliente_telefono}
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                    <span>{fmtFecha(p.created_at)}</span>
                    <span>{p.total_rollos} kg · ${p.total.toLocaleString('es-AR')}</span>
                    {p.descuento_por_rollo > 0 && (
                      <span className="text-orange-600 dark:text-orange-400">-${p.descuento_por_rollo.toLocaleString('es-AR')}/kg</span>
                    )}
                  </div>
                </div>
                <ChevronDown size={14} className={`shrink-0 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
              </button>

              {/* Detalle expandido */}
              {isExpanded && (
                <div className="border-t border-border px-4 py-4 space-y-4">
                  {/* Items */}
                  <div className="space-y-2">
                    {p.items.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0 bg-muted-foreground/20 border border-border" />
                        <span className="flex-1 min-w-0">
                          <span className="font-medium">{item.color}</span>
                          <span className="text-muted-foreground ml-1">— {item.material} · {item.marca}</span>
                        </span>
                        <span className="font-semibold tabular-nums shrink-0">{item.rollos} kg</span>
                        <span className="text-muted-foreground tabular-nums shrink-0 text-xs">${item.precio_unitario.toLocaleString('es-AR')}/kg</span>
                      </div>
                    ))}
                  </div>

                  {/* Totales */}
                  <div className="bg-secondary/30 rounded-lg px-3 py-2.5 text-sm">
                    <div className="flex justify-between font-bold">
                      <span>{p.total_rollos} kg total</span>
                      <span>${p.total.toLocaleString('es-AR')}</span>
                    </div>
                    {p.descuento_por_rollo > 0 && (
                      <p className="text-[11px] text-orange-600 dark:text-orange-400 mt-0.5">
                        Descuento aplicado: -${p.descuento_por_rollo.toLocaleString('es-AR')} por kg
                      </p>
                    )}
                  </div>

                  {p.nota && (
                    <p className="text-xs text-muted-foreground italic">Nota: {p.nota}</p>
                  )}

                  {/* Acciones */}
                  <div className="flex gap-2 flex-wrap">
                    {p.estado === 'pendiente' && (
                      <>
                        <button
                          onClick={() => handleAccion(p.id, 'confirmar')}
                          disabled={isProcesando}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
                        >
                          {isProcesando ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                          Confirmar y descontar stock
                        </button>
                        <button
                          onClick={() => handleAccion(p.id, 'cancelar')}
                          disabled={isProcesando}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm font-medium transition-colors disabled:opacity-50"
                        >
                          <X size={13} />
                          Cancelar pedido
                        </button>
                        {p.cliente_telefono && (
                          <a
                            href={`https://wa.me/${p.cliente_telefono.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola ${p.cliente_nombre.split(' ')[0]}! Revisé tu pedido N°${p.numero} y está confirmado. Por favor aboná una seña para que te lo reserve. 🙌`)}`}
                            target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#25D366] hover:bg-[#1ebe5a] text-white text-sm font-medium transition-colors"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M11.999 2C6.477 2 2 6.477 2 12c0 1.936.53 3.744 1.452 5.29L2.046 22l4.799-1.396A9.956 9.956 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 11.999 2zm.001 18a7.96 7.96 0 01-4.073-1.117l-.291-.174-3.028.881.86-3.105-.19-.3A7.96 7.96 0 014 12c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8-8 8z"/></svg>
                            Avisar al cliente
                          </a>
                        )}
                      </>
                    )}
                    {p.estado === 'confirmado' && (
                      <button
                        onClick={() => marcarEntregado(p.id)}
                        disabled={isProcesando}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                      >
                        <Package size={13} />
                        Marcar como entregado
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Modal confirmación de acción */}
      {notaModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-sm">
            <div className="p-5 space-y-4">
              <h3 className="font-semibold">
                {notaModal.accion === 'confirmar' ? '✅ Confirmar pedido y descontar stock' : '🚫 Cancelar pedido'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {notaModal.accion === 'confirmar'
                  ? 'Se confirmará el pedido y se descontará el stock automáticamente de cada filamento.'
                  : 'El pedido se marcará como cancelado. El stock NO se modifica.'}
              </p>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Nota interna (opcional)</label>
                <input
                  type="text"
                  value={notaTexto}
                  onChange={e => setNotaTexto(e.target.value)}
                  placeholder={notaModal.accion === 'confirmar' ? 'ej. Cliente pagó seña' : 'ej. Sin stock disponible'}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setNotaModal(null)}
                  className="flex-1 px-4 py-2 text-sm border border-border rounded-lg hover:bg-secondary transition-colors"
                >
                  Volver
                </button>
                <button
                  onClick={ejecutarAccion}
                  className={`flex-1 px-4 py-2 text-sm rounded-lg text-white font-medium transition-colors ${
                    notaModal.accion === 'confirmar' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-500 hover:bg-red-600'
                  }`}
                >
                  {notaModal.accion === 'confirmar' ? 'Sí, confirmar' : 'Sí, cancelar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Vista principal ────────────────────────────────────────────────────────────

export default function FilamentosClient({ initialFilamentos, clientes = [] }: { initialFilamentos: Filamento[]; clientes?: ClienteBasic[] }) {
  const [filamentos, setFilamentos] = useState<Filamento[]>(initialFilamentos)
  const [showNuevo, setShowNuevo] = useState(false)
  const [showVentaGlobal, setShowVentaGlobal] = useState(false)
  const [tab, setTab] = useState<'stock' | 'ventas' | 'clientes' | 'pedidos'>('stock')

  // Filtros
  const [filtroMarca, setFiltroMarca] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroMaterial, setFiltroMaterial] = useState('')
  const [filtroColor, setFiltroColor] = useState('')
  const [filtroStockMin, setFiltroStockMin] = useState(0) // en kg
  const [ordenStock, setOrdenStock] = useState<'default' | 'asc' | 'desc'>('default')

  function sortFilamentos(list: Filamento[]): Filamento[] {
    return [...list].sort((a, b) => {
      const marcaA = a.marca || 'ZZZZ'
      const marcaB = b.marca || 'ZZZZ'
      return marcaA.localeCompare(marcaB, 'es') ||
        (a.tipo || '').localeCompare(b.tipo || '', 'es') ||
        (a.color || '').localeCompare(b.color || '', 'es') ||
        a.nombre.localeCompare(b.nombre, 'es')
    })
  }

  function handleCreated(f: Filamento) {
    setFilamentos((prev) => sortFilamentos([...prev, f]))
  }

  function handleUpdate(updated: Filamento) {
    setFilamentos((prev) => sortFilamentos(prev.map((f) => f.id === updated.id ? updated : f)))
  }

  function handleDelete(id: string) {
    setFilamentos((prev) => prev.filter((f) => f.id !== id))
  }

  // Opciones únicas para filtros
  const marcasUnicas = [...new Set(filamentos.map(f => f.marca).filter(Boolean))].sort()
  const tiposUnicos = [...new Set(filamentos.map(f => f.tipo).filter(Boolean))].sort()
  const materialesUnicos = [...new Set(filamentos.map(f => f.material))].sort()
  const coloresUnicos = [...new Set(filamentos.map(f => f.color).filter(Boolean))].sort()

  const hayFiltros = filtroMarca || filtroTipo || filtroMaterial || filtroColor || filtroStockMin > 0 || ordenStock !== 'default'

  let filamentosFiltrados = filamentos.filter(f => {
    if (filtroMarca && f.marca !== filtroMarca) return false
    if (filtroTipo && f.tipo !== filtroTipo) return false
    if (filtroMaterial && f.material !== filtroMaterial) return false
    if (filtroColor && !f.color.toLowerCase().includes(filtroColor.toLowerCase())) return false
    if (filtroStockMin > 0 && totalGramos(f) < filtroStockMin * 1000) return false
    return true
  })

  if (ordenStock !== 'default') {
    filamentosFiltrados = [...filamentosFiltrados].sort((a, b) =>
      ordenStock === 'desc'
        ? totalGramos(b) - totalGramos(a)
        : totalGramos(a) - totalGramos(b)
    )
  }

  const totalGr = filamentosFiltrados.reduce((s, f) => s + totalGramos(f), 0)
  const totalRollos = filamentosFiltrados.reduce((s, f) => s + f.rollos_cerrados, 0)

  // Cuando ordenamos por stock no agrupamos por marca (pierde el sentido)
  const agrupar = ordenStock === 'default'
  const porMarca = filamentosFiltrados.reduce<Record<string, Filamento[]>>((acc, f) => {
    const key = agrupar ? (f.marca || '(Sin marca)') : 'todos'
    if (!acc[key]) acc[key] = []
    acc[key].push(f)
    return acc
  }, {})

  const porMaterial = filamentos.reduce<Record<string, Filamento[]>>((acc, f) => {
    if (!acc[f.material]) acc[f.material] = []
    acc[f.material].push(f)
    return acc
  }, {})

  function chipBtn(label: string, active: boolean, onClick: () => void) {
    return (
      <button
        key={label}
        onClick={onClick}
        className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
          active
            ? 'bg-foreground text-background border-foreground'
            : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
        }`}
      >
        {label}
      </button>
    )
  }

  return (
    <div className="space-y-6">
      {showNuevo && (
        <NuevoFilamentoModal onClose={() => setShowNuevo(false)} onCreated={handleCreated} />
      )}
      {showVentaGlobal && (
        <VentaGlobalModal
          filamentos={filamentos}
          clientes={clientes}
          onClose={() => setShowVentaGlobal(false)}
          onVendido={(updatedFilamentos) => {
            updatedFilamentos.forEach(handleUpdate)
            setShowVentaGlobal(false)
          }}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">🧵 Filamentos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {filamentosFiltrados.length}{hayFiltros ? `/${filamentos.length}` : ''} tipo{filamentos.length !== 1 ? 's' : ''}
            {totalGr > 0 && ` · ${fmtGr(totalGr)} totales`}
            {totalRollos > 0 && ` · ${totalRollos} rollo${totalRollos !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowVentaGlobal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-colors"
          >
            <ShoppingBag size={14} /> Venta
          </button>
          <button
            onClick={() => setShowNuevo(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Plus size={14} /> Nuevo filamento
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setTab('stock')}
          className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${tab === 'stock' ? 'bg-foreground text-primary-foreground border-foreground' : 'border-border text-muted-foreground hover:text-foreground'}`}>
          🧵 Stock
        </button>
        <button onClick={() => setTab('pedidos')}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${tab === 'pedidos' ? 'bg-yellow-500 text-white border-yellow-500' : 'border-border text-muted-foreground hover:text-foreground hover:border-yellow-400'}`}>
          <Package size={13} /> Pedidos web
        </button>
        <button onClick={() => setTab('ventas')}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${tab === 'ventas' ? 'bg-green-600 text-white border-green-600' : 'border-border text-muted-foreground hover:text-foreground hover:border-green-400'}`}>
          <TrendingUp size={13} /> Historial ventas
        </button>
        <button onClick={() => setTab('clientes')}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${tab === 'clientes' ? 'bg-blue-600 text-white border-blue-600' : 'border-border text-muted-foreground hover:text-foreground hover:border-blue-400'}`}>
          👤 Clientes
        </button>
      </div>

      {tab === 'pedidos' && <PedidosPendientesTab />}
      {tab === 'ventas' && <HistorialVentas />}
      {tab === 'clientes' && <ClientesFilamentoTab clientes={clientes} />}

      {tab === 'stock' && (
        <>
          {/* ── Filtros ── */}
          {filamentos.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-4 space-y-3">
              {/* Marca */}
              {marcasUnicas.length > 1 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground w-14 shrink-0">Marca</span>
                  {chipBtn('Todas', !filtroMarca, () => setFiltroMarca(''))}
                  {marcasUnicas.map(m => chipBtn(m, filtroMarca === m, () => setFiltroMarca(filtroMarca === m ? '' : m)))}
                </div>
              )}
              {/* Tipo */}
              {tiposUnicos.length > 1 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground w-14 shrink-0">Tipo</span>
                  {chipBtn('Todos', !filtroTipo, () => setFiltroTipo(''))}
                  {tiposUnicos.map(t => chipBtn(t, filtroTipo === t, () => setFiltroTipo(filtroTipo === t ? '' : t)))}
                </div>
              )}
              {/* Material */}
              {materialesUnicos.length > 1 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground w-14 shrink-0">Material</span>
                  {chipBtn('Todos', !filtroMaterial, () => setFiltroMaterial(''))}
                  {materialesUnicos.map(m => chipBtn(m, filtroMaterial === m, () => setFiltroMaterial(filtroMaterial === m ? '' : m)))}
                </div>
              )}
              {/* Color */}
              {coloresUnicos.length > 1 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground w-14 shrink-0">Color</span>
                  <div className="flex flex-wrap gap-1.5">
                    {chipBtn('Todos', !filtroColor, () => setFiltroColor(''))}
                    {coloresUnicos.map(c => (
                      <button
                        key={c}
                        onClick={() => setFiltroColor(filtroColor === c ? '' : c)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                          filtroColor === c
                            ? 'bg-foreground text-background border-foreground'
                            : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
                        }`}
                      >
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${colorDot(c)}`} />
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {/* Stock mínimo */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground w-14 shrink-0">Stock</span>
                {[0, 1, 2, 3, 5].map(kg => (
                  <button
                    key={kg}
                    onClick={() => setFiltroStockMin(kg)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                      filtroStockMin === kg
                        ? 'bg-foreground text-background border-foreground'
                        : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
                    }`}
                  >
                    {kg === 0 ? 'Todos' : `+${kg} kg`}
                  </button>
                ))}
              </div>

              {/* Ordenar por cantidad */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground w-14 shrink-0">Ordenar</span>
                {chipBtn('Por marca', ordenStock === 'default', () => setOrdenStock('default'))}
                {chipBtn('↑ Menor stock', ordenStock === 'asc', () => setOrdenStock(ordenStock === 'asc' ? 'default' : 'asc'))}
                {chipBtn('↓ Mayor stock', ordenStock === 'desc', () => setOrdenStock(ordenStock === 'desc' ? 'default' : 'desc'))}
              </div>

              {/* Limpiar */}
              {hayFiltros && (
                <button
                  onClick={() => { setFiltroMarca(''); setFiltroTipo(''); setFiltroMaterial(''); setFiltroColor(''); setFiltroStockMin(0); setOrdenStock('default') }}
                  className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          )}

          {/* Resumen por material */}
          {filamentos.length > 0 && Object.keys(porMaterial).length > 0 && (
            <div className="flex flex-wrap gap-2">
              {Object.entries(porMaterial).map(([mat, items]) => {
                const grTotal = items.reduce((s, f) => s + totalGramos(f), 0)
                return (
                  <div key={mat} className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-1.5">
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium border ${MATERIAL_COLORS[mat]}`}>
                      {mat}
                    </span>
                    <span className="text-sm font-bold tabular-nums">{fmtGr(grTotal)}</span>
                  </div>
                )
              })}
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
          ) : filamentosFiltrados.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground">
              <p className="text-sm">Sin resultados para los filtros seleccionados</p>
              <button onClick={() => { setFiltroMarca(''); setFiltroTipo(''); setFiltroMaterial(''); setFiltroColor('') }}
                className="mt-2 text-xs underline underline-offset-2 hover:text-foreground">
                Limpiar filtros
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(porMarca).map(([marca, items]) => (
                <section key={marca}>
                  {agrupar && (
                    <div className="flex items-center gap-2 mb-3">
                      <h3 className="text-sm font-bold text-foreground">{marca}</h3>
                      <span className="text-xs text-muted-foreground">
                        · {fmtGr(items.reduce((s, f) => s + totalGramos(f), 0))} · {items.length} tipo{items.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  )}
                  <div className="space-y-2">
                    {items.map((f) => (
                      <FilamentoCard key={f.id} filamento={f} clientes={clientes} onUpdate={handleUpdate} onDelete={() => handleDelete(f.id)} />
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
