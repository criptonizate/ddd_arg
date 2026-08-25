'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import { Plus, Trash2, Printer, ShoppingCart, X, Percent, CheckCircle, Save, FolderOpen, ImageDown, Search } from 'lucide-react'
import { createManualSale } from '@/lib/actions/orders'
import { savePresupuesto, getPresupuestos, deletePresupuesto, duplicatePresupuesto } from '@/lib/actions/presupuestos'
import type { PresupuestoRecord } from '@/lib/actions/presupuestos'
import { getClientesBasic } from '@/lib/actions/clientes'
import { getProductosSugeridos } from '@/lib/actions/products'
import type { ProductoSugerido } from '@/lib/actions/products'
import { formatARS } from '@/lib/utils'

interface Item {
  descripcion: string
  unidades: number | ''
  precio: number | ''
  precioEspecial?: number | '' // precio con descuento; undefined = sin precio especial
  descuentoPct?: string        // % que auto-calcula precioEspecial (solo UI)
}

interface PedidoForm {
  cliente_nombre: string
  cliente_telefono: string
  cliente_email: string
  entrega: 'retiro' | 'envio'
  direccion_envio: string
  metodo_pago: 'efectivo' | 'transferencia' | 'mercadopago' | 'whatsapp'
  nota: string
}

const EMPRESA = {
  nombre: 'Arnaudo Juan Pablo',
  direccion: 'Adolfo E Dávila 279 - La Rioja',
  cuit: '20-36255511-7',
  telefono: '3804559909',
  email: 'iarnaudojuanpablo@gmail.com',
}

const TEAL = '#00AAAA'

function formatNum(n: number): string {
  const abs = Math.abs(n)
  const formatted = abs.toLocaleString('es-AR', { maximumFractionDigits: 0 })
  return n < 0 ? `- $${formatted}` : `$${formatted}`
}

function today(): string {
  return new Date().toLocaleDateString('es-AR', { day: 'numeric', month: 'numeric', year: 'numeric' })
}

const INPUT_CLASS =
  'w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring'

type ClienteBasic = { id: string; nombre: string; telefono: string | null; email: string | null; direccion: string | null }

export default function PresupuestoClient() {
  const [cliente, setCliente] = useState({
    nombre: '', direccion: '', cuit: '', telefono: '', email: '',
  })

  // Autocomplete clientes existentes
  const [clientesAll, setClientesAll] = useState<ClienteBasic[]>([])
  const [clienteSearch, setClienteSearch] = useState('')
  const [showClienteDropdown, setShowClienteDropdown] = useState(false)
  const clienteDropdownRef = useRef<HTMLDivElement>(null)

  const [productosSugeridos, setProductosSugeridos] = useState<ProductoSugerido[]>([])

  useEffect(() => {
    getClientesBasic().then(setClientesAll)
    getProductosSugeridos().then(setProductosSugeridos)
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (clienteDropdownRef.current && !clienteDropdownRef.current.contains(e.target as Node)) {
        setShowClienteDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const clientesFiltrados = clienteSearch.trim().length >= 1
    ? clientesAll.filter(c => c.nombre.toLowerCase().includes(clienteSearch.toLowerCase())).slice(0, 8)
    : []

  function seleccionarCliente(c: ClienteBasic) {
    setCliente(prev => ({
      ...prev,
      nombre: c.nombre,
      telefono: c.telefono ?? '',
      email: c.email ?? '',
      direccion: c.direccion ?? '',
    }))
    setClienteSearch('')
    setShowClienteDropdown(false)
  }
  const [validez, setValidez] = useState(10)
  const [activeDropdownIdx, setActiveDropdownIdx] = useState<number | null>(null)

  const filtrarSugeridos = useCallback((texto: string) => {
    if (!texto.trim() || texto.trim().length < 1) return []
    const q = texto.toLowerCase()
    return productosSugeridos.filter((p) => {
      const nombre = p.variante ? `${p.nombre} — ${p.variante}` : p.nombre
      return nombre.toLowerCase().includes(q)
    }).slice(0, 8)
  }, [productosSugeridos])

  const [items, setItems] = useState<Item[]>([
    { descripcion: '', unidades: '', precio: '' },
    { descripcion: '', unidades: '', precio: '' },
  ])

  // Descuento mayorista
  const [showDescuento, setShowDescuento] = useState(false)
  const [descuentoPct, setDescuentoPct] = useState('')

  // Condiciones de pago
  const [condicionesPago, setCondicionesPago] = useState('30% adelanto, saldo contra entrega')

  // Consignación
  const [esConsignacion, setEsConsignacion] = useState(false)
  const [diasDevolucion, setDiasDevolucion] = useState(15)

  // Importar desde calculadora (via localStorage)
  useEffect(() => {
    try {
      // Importar desde pedido (incluye cliente + items)
      const rawPedido = localStorage.getItem('presupuesto_importar_pedido')
      if (rawPedido) {
        const payload: { cliente: { nombre: string; telefono: string }; items: { descripcion: string; unidades: number; precio: number }[] } = JSON.parse(rawPedido)
        if (payload.cliente) {
          setCliente((prev) => ({ ...prev, nombre: payload.cliente.nombre, telefono: payload.cliente.telefono }))
          setClienteSearch(payload.cliente.nombre)
        }
        if (payload.items?.length > 0) {
          const nuevos: Item[] = payload.items.map((i) => ({ descripcion: i.descripcion, unidades: i.unidades as number | '', precio: i.precio as number | '' }))
          setItems([...nuevos, { descripcion: '', unidades: '' as const, precio: '' as const }])
        }
        localStorage.removeItem('presupuesto_importar_pedido')
        return
      }

      // Importar desde calculadora (solo items)
      const raw = localStorage.getItem('presupuesto_importar')
      if (raw) {
        const importados: { descripcion: string; unidades: number; precio: number }[] = JSON.parse(raw)
        if (importados.length > 0) {
          setItems((prev) => {
            const vacias = prev.filter((i) => !i.descripcion.trim())
            const sinVacias = prev.filter((i) => i.descripcion.trim())
            const nuevos: Item[] = importados.map((i) => ({ descripcion: i.descripcion, unidades: i.unidades as number | '', precio: i.precio as number | '' }))
            return [...sinVacias, ...nuevos, ...(vacias.length > 0 ? [] : [{ descripcion: '', unidades: '' as const, precio: '' as const }])]
          })
        }
        localStorage.removeItem('presupuesto_importar')
      }
    } catch { /* silent */ }
  }, [])

  // Guardar / cargar presupuestos
  const [savingPresupuesto, setSavingPresupuesto] = useState(false)
  const [showPresupuestosModal, setShowPresupuestosModal] = useState(false)
  const [presupuestosList, setPresupuestosList] = useState<PresupuestoRecord[]>([])
  const [loadingList, setLoadingList] = useState(false)

  async function handleSavePresupuesto() {
    setSavingPresupuesto(true)
    const validItems = items
      .filter(i => i.descripcion.trim())
      .map(i => ({
        descripcion: i.descripcion.trim(),
        unidades: Number(i.unidades) || 0,
        precio: Number(i.precio) || 0,
        ...(i.precioEspecial !== undefined ? { precioEspecial: Number(i.precioEspecial) || 0 } : {}),
      }))
    await savePresupuesto({
      cliente_nombre: cliente.nombre,
      cliente_direccion: cliente.direccion,
      cliente_cuit: cliente.cuit,
      cliente_telefono: cliente.telefono,
      cliente_email: cliente.email,
      items: validItems,
      descuento_mayorista_pct: parseFloat(descuentoPct) || 0,
      nota: '',
      condiciones_pago: condicionesPago,
    })
    setSavingPresupuesto(false)
  }

  async function handleOpenPresupuestosModal() {
    setShowPresupuestosModal(true)
    setLoadingList(true)
    const list = await getPresupuestos()
    setPresupuestosList(list)
    setLoadingList(false)
  }

  function handleLoadPresupuesto(p: PresupuestoRecord) {
    setCliente({
      nombre: p.cliente_nombre,
      direccion: p.cliente_direccion,
      cuit: p.cliente_cuit,
      telefono: p.cliente_telefono,
      email: p.cliente_email,
    })
    setItems(p.items.map(i => ({
      descripcion: i.descripcion,
      unidades: i.unidades,
      precio: i.precio,
      ...(i.precioEspecial !== undefined ? { precioEspecial: i.precioEspecial } : {}),
    })))
    if (p.descuento_mayorista_pct > 0) setDescuentoPct(String(p.descuento_mayorista_pct))
    if (p.condiciones_pago) setCondicionesPago(p.condiciones_pago)
    setShowPresupuestosModal(false)
  }

  async function handleDuplicarPresupuesto(id: string) {
    await duplicatePresupuesto(id)
    const list = await getPresupuestos()
    setPresupuestosList(list)
  }

  async function handleDeletePresupuesto(id: string) {
    await deletePresupuesto(id)
    setPresupuestosList(prev => prev.filter(p => p.id !== id))
  }

  // Modal generar pedido
  const [showPedidoModal, setShowPedidoModal] = useState(false)
  const [pedidoForm, setPedidoForm] = useState<PedidoForm>({
    cliente_nombre: '', cliente_telefono: '', cliente_email: '',
    entrega: 'retiro', direccion_envio: '', metodo_pago: 'efectivo', nota: '',
  })
  const [pedidoLoading, setPedidoLoading] = useState(false)
  const [pedidoResult, setPedidoResult] = useState<{ orderId?: string; error?: string } | null>(null)

  function updateCliente(field: keyof typeof cliente, value: string) {
    setCliente(c => ({ ...c, [field]: value }))
  }

  function updateItem(idx: number, field: keyof Item, value: string | number | '') {
    setItems(prev => prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item)))
  }

  function addItem() {
    setItems(prev => [...prev, { descripcion: '', unidades: '', precio: '' }])
  }

  function removeItem(idx: number) {
    if (items.length <= 1) return
    setItems(prev => prev.filter((_, i) => i !== idx))
  }

  function togglePrecioEspecial(idx: number) {
    setItems(prev => prev.map((item, i) => {
      if (i !== idx) return item
      if (item.precioEspecial !== undefined) {
        const next = { ...item }
        delete next.precioEspecial
        delete next.descuentoPct
        return next
      }
      return { ...item, precioEspecial: '', descuentoPct: '' }
    }))
  }

  function updatePrecioEspecialPct(idx: number, pct: string) {
    const pctNum = parseFloat(pct)
    const precioBase = Number(items[idx].precio) || 0
    const calculado = precioBase > 0 && pctNum > 0 && pctNum <= 100
      ? Math.round(precioBase * (1 - pctNum / 100))
      : ('' as const)
    setItems(prev => prev.map((item, i) =>
      i === idx ? { ...item, descuentoPct: pct, precioEspecial: calculado } : item
    ))
  }

  function updatePrecioEspecialDirecto(idx: number, val: number | '') {
    setItems(prev => prev.map((item, i) =>
      i === idx ? { ...item, precioEspecial: val, descuentoPct: '' } : item
    ))
  }

  const subtotal = items.reduce((s, i) => {
    const u = Number(i.unidades) || 0
    const p = i.precioEspecial !== undefined ? (Number(i.precioEspecial) || 0) : (Number(i.precio) || 0)
    return s + u * p
  }, 0)

  function addDescuento() {
    const pct = parseFloat(descuentoPct)
    if (!pct || pct <= 0 || pct > 100) return
    // Calcula sobre el subtotal de items positivos (excluye descuentos ya existentes)
    const basePositiva = items.reduce((s, i) => {
      const total = (Number(i.unidades) || 0) * (Number(i.precio) || 0)
      return s + (total > 0 ? total : 0)
    }, 0)
    const monto = -Math.round(basePositiva * pct / 100)
    setItems(prev => [...prev, {
      descripcion: `Descuento Mayorista ${pct}%`,
      unidades: 1,
      precio: monto,
    }])
    setDescuentoPct('')
    setShowDescuento(false)
  }

  function openPedidoModal() {
    setPedidoForm({
      cliente_nombre: cliente.nombre,
      cliente_telefono: cliente.telefono,
      cliente_email: cliente.email,
      entrega: 'retiro',
      direccion_envio: cliente.direccion,
      metodo_pago: 'efectivo',
      nota: '',
    })
    setPedidoResult(null)
    setShowPedidoModal(true)
  }

  async function handleCrearPedido() {
    const validItems = items
      .filter(i => i.descripcion.trim() && i.unidades !== '' && i.precio !== '')
      .map(i => ({
        product_id: '',
        variant_id: '',
        nombre_producto: i.descripcion.trim(),
        nombre_variante: '',
        cantidad: Math.max(1, Number(i.unidades) || 1),
        precio_unitario: i.precioEspecial !== undefined ? (Number(i.precioEspecial) || 0) : (Number(i.precio) || 0),
      }))

    if (!validItems.length) {
      setPedidoResult({ error: 'No hay ítems válidos en el presupuesto' })
      return
    }
    const total = validItems.reduce((s, i) => s + i.cantidad * i.precio_unitario, 0)
    if (total <= 0) {
      setPedidoResult({ error: 'El total del pedido debe ser mayor a $0' })
      return
    }

    setPedidoLoading(true)
    try {
      const result = await createManualSale({
        cliente_nombre: pedidoForm.cliente_nombre,
        cliente_telefono: pedidoForm.cliente_telefono,
        cliente_email: pedidoForm.cliente_email || undefined,
        entrega: pedidoForm.entrega,
        direccion_envio: pedidoForm.direccion_envio,
        metodo_pago: pedidoForm.metodo_pago,
        nota: pedidoForm.nota,
        sena: 0,
        prioridad: false,
        esLocal: false,
        items: validItems,
      })
      if (result && 'error' in result && result.error) {
        const msg = typeof result.error === 'string'
          ? result.error
          : Object.values(result.error).flat().join(', ')
        setPedidoResult({ error: msg })
      } else {
        setPedidoResult({ orderId: (result as { orderId: string }).orderId })
      }
    } catch {
      setPedidoResult({ error: 'Error inesperado al crear el pedido' })
    } finally {
      setPedidoLoading(false)
    }
  }

  const [exportingPNG, setExportingPNG] = useState(false)

  async function handleExportPNG() {
    const el = document.getElementById('presupuesto-preview')
    if (!el) return
    setExportingPNG(true)
    try {
      const { toPng } = await import('html-to-image')
      const fecha = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-')
      const nombre = cliente.nombre.trim() || 'sin nombre'
      const dataUrl = await toPng(el, {
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        skipFonts: true,
        style: { backgroundColor: '#ffffff', color: '#000000' },
      })
      const link = document.createElement('a')
      link.download = `Presupuesto ${nombre} - ${fecha}.png`
      link.href = dataUrl
      link.click()
    } catch (e) {
      console.error('PNG export error:', e)
      alert('No se pudo exportar la imagen. Intentá de nuevo.')
    } finally {
      setExportingPNG(false)
    }
  }

  const PREVIEW_ROWS = Math.max(8, items.length + 2)

  return (
    <div>
      <style>{`
        @media print {
          body > * { visibility: hidden; }
          #presupuesto-preview, #presupuesto-preview * { visibility: visible; }
          #presupuesto-preview {
            position: fixed !important;
            inset: 0;
            margin: 0;
            padding: 0;
            width: 100%;
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
          }
          @page { margin: 10mm; size: A4; }
        }
      `}</style>

      {/* ── Formulario (oculto al imprimir) ── */}
      <div className="print:hidden space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-2xl font-bold">📋 Presupuesto</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenPresupuestosModal}
              className="flex items-center gap-2 border border-border hover:bg-secondary px-3 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <FolderOpen size={14} /> Cargar
            </button>
            <button
              onClick={handleSavePresupuesto}
              disabled={savingPresupuesto}
              className="flex items-center gap-2 border border-border hover:bg-secondary px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              <Save size={14} /> {savingPresupuesto ? 'Guardando...' : 'Guardar'}
            </button>
            <button
              onClick={openPedidoModal}
              className="flex items-center gap-2 border border-border hover:bg-secondary px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <ShoppingCart size={15} />
              Generar pedido
            </button>
            <button
              onClick={handleExportPNG}
              disabled={exportingPNG}
              className="flex items-center gap-2 border border-border hover:bg-secondary px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
            >
              <ImageDown size={15} />
              {exportingPNG ? 'Generando...' : 'Exportar PNG'}
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 bg-foreground text-primary-foreground hover:bg-foreground/90 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <Printer size={15} />
              Generar PDF / Imprimir
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Datos del cliente */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-3">
            <h3 className="font-semibold text-sm">Datos del cliente</h3>

            {/* Buscar cliente existente */}
            <div className="relative" ref={clienteDropdownRef}>
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <input
                  value={clienteSearch}
                  onChange={e => { setClienteSearch(e.target.value); setShowClienteDropdown(true) }}
                  onFocus={() => clienteSearch.trim() && setShowClienteDropdown(true)}
                  placeholder="Buscar cliente existente..."
                  className="w-full border border-dashed border-input rounded-lg pl-8 pr-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              {showClienteDropdown && clientesFiltrados.length > 0 && (
                <div className="absolute z-20 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
                  {clientesFiltrados.map(c => (
                    <button
                      key={c.id}
                      onMouseDown={e => { e.preventDefault(); seleccionarCliente(c) }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-secondary transition-colors"
                    >
                      <span className="font-medium">{c.nombre}</span>
                      {c.telefono && <span className="text-muted-foreground text-xs ml-2">{c.telefono}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {(
              [
                { field: 'nombre', label: 'Nombre' },
                { field: 'direccion', label: 'Dirección' },
                { field: 'cuit', label: 'CUIT' },
                { field: 'telefono', label: 'Teléfono' },
                { field: 'email', label: 'E-mail' },
              ] as { field: keyof typeof cliente; label: string }[]
            ).map(({ field, label }) => (
              <div key={field}>
                <label className="text-xs font-medium block mb-1">{label}</label>
                <input
                  value={cliente[field]}
                  onChange={(e) => updateCliente(field, e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>
            ))}
          </div>

          {/* Config */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-3">
            <h3 className="font-semibold text-sm">Opciones</h3>
            <div>
              <label className="text-xs font-medium block mb-1">Validez (días)</label>
              <input
                type="number"
                min="1"
                value={validez}
                onChange={(e) => setValidez(Number(e.target.value))}
                className="w-32 border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">Condiciones de pago</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {['30% adelanto, saldo contra entrega', '50% adelanto, saldo contra entrega', 'Pago total anticipado', 'A convenir'].map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setCondicionesPago(opt)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${condicionesPago === opt ? 'bg-foreground text-primary-foreground border-foreground' : 'border-border text-muted-foreground hover:text-foreground hover:bg-secondary'}`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
              <input
                value={condicionesPago}
                onChange={(e) => setCondicionesPago(e.target.value)}
                placeholder="O escribí las condiciones..."
                className={INPUT_CLASS}
              />
            </div>

            {/* Consignación */}
            <div>
              <label className="text-xs font-medium block mb-2">Modalidad</label>
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={() => setEsConsignacion((v) => !v)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${esConsignacion ? 'bg-amber-100 border-amber-400 text-amber-800 dark:bg-amber-900/30 dark:border-amber-600 dark:text-amber-300' : 'border-border text-muted-foreground hover:text-foreground hover:bg-secondary'}`}
                >
                  <span className={`w-3 h-3 rounded-full border-2 transition-colors ${esConsignacion ? 'bg-amber-500 border-amber-500' : 'border-muted-foreground'}`} />
                  Consignación
                </button>
                {esConsignacion && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Plazo devolución:</span>
                    <input
                      type="number"
                      min={1}
                      max={90}
                      value={diasDevolucion}
                      onChange={(e) => setDiasDevolucion(Math.max(1, parseInt(e.target.value) || 15))}
                      className="w-16 border border-input rounded-lg px-2 py-1 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring text-center"
                    />
                    <span className="text-xs text-muted-foreground">días desde la entrega</span>
                  </div>
                )}
              </div>
              {esConsignacion && (
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-1.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-1.5">
                  Los productos se entregan en consignación. El cliente tiene {diasDevolucion} días desde la fecha de entrega para devolver lo no vendido o abonar el total.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-semibold text-sm mb-4">Productos / servicios</h3>
          <div className="space-y-2">
            {/* Header — solo desktop */}
            <div className="hidden sm:grid sm:grid-cols-12 gap-2 text-xs font-medium text-muted-foreground px-1">
              <div className="col-span-5">Descripción</div>
              <div className="col-span-2 text-center">Unidades</div>
              <div className="col-span-3">Precio unitario $</div>
              <div className="col-span-2" />
            </div>
            {items.map((item, idx) => (
              <div key={idx} className="space-y-1">
                {/* Mobile: col-2 grid (descripción full, unidades+precio en 2 cols, botones full) */}
                {/* Desktop: col-12 grid con proporciones originales */}
                <div className="grid grid-cols-2 sm:grid-cols-12 gap-2 items-center">
                  <div className="col-span-2 sm:col-span-5 relative">
                    <input
                      value={item.descripcion}
                      onChange={(e) => {
                        updateItem(idx, 'descripcion', e.target.value)
                        setActiveDropdownIdx(idx)
                      }}
                      onFocus={() => setActiveDropdownIdx(idx)}
                      onBlur={() => setTimeout(() => setActiveDropdownIdx(null), 150)}
                      placeholder="Ej: Escarapelas personalizadas"
                      className="w-full border border-input rounded-lg px-2.5 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                      autoComplete="off"
                    />
                    {activeDropdownIdx === idx && filtrarSugeridos(item.descripcion).length > 0 && (
                      <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
                        {filtrarSugeridos(item.descripcion).map((s, si) => {
                          const nombre = s.variante ? `${s.nombre} — ${s.variante}` : s.nombre
                          return (
                            <button
                              key={si}
                              type="button"
                              onMouseDown={() => {
                                updateItem(idx, 'descripcion', nombre)
                                updateItem(idx, 'precio', s.ultimo_precio)
                                setActiveDropdownIdx(null)
                              }}
                              className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-secondary text-left transition-colors"
                            >
                              <span className="truncate">{nombre}</span>
                              <span className="text-xs text-muted-foreground shrink-0 ml-2">{formatARS(s.ultimo_precio)}</span>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                  <div className="sm:col-span-2">
                    <input
                      type="number"
                      value={item.unidades}
                      onChange={(e) => updateItem(idx, 'unidades', e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="Unid."
                      className="w-full border border-input rounded-lg px-2.5 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring text-center"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <input
                      type="number"
                      value={item.precio}
                      onChange={(e) => updateItem(idx, 'precio', e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="Precio $"
                      className={`w-full border border-input rounded-lg px-2.5 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring ${item.precioEspecial !== undefined ? 'line-through text-muted-foreground' : ''}`}
                    />
                  </div>
                  <div className="sm:col-span-2 flex justify-end gap-1">
                    <button
                      onClick={() => togglePrecioEspecial(idx)}
                      title="Precio especial / descuento"
                      className={`p-1.5 rounded transition-colors text-xs font-bold ${item.precioEspecial !== undefined ? 'bg-teal-100 text-teal-700 hover:bg-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:hover:bg-teal-900/50' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}
                    >
                      <Percent size={12} />
                    </button>
                    <button
                      onClick={() => removeItem(idx)}
                      disabled={items.length <= 1}
                      className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive disabled:opacity-30 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Sub-fila precio especial */}
                {item.precioEspecial !== undefined && (
                  <div className="flex items-center gap-2 pl-3 pb-0.5">
                    <span className="text-xs text-teal-700 dark:text-teal-300 font-medium shrink-0">Precio especial:</span>
                    <input
                      type="number"
                      value={item.descuentoPct ?? ''}
                      onChange={(e) => updatePrecioEspecialPct(idx, e.target.value)}
                      placeholder="% desc."
                      min="1"
                      max="100"
                      className="w-20 border border-teal-300 dark:border-teal-700 rounded-lg px-2 py-1 text-xs bg-background focus:outline-none focus:ring-1 focus:ring-teal-400 dark:focus:ring-teal-600 text-center"
                    />
                    <span className="text-xs text-muted-foreground">%  →</span>
                    <input
                      type="number"
                      value={item.precioEspecial}
                      onChange={(e) => updatePrecioEspecialDirecto(idx, e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="$0"
                      className="w-28 border border-teal-300 dark:border-teal-700 rounded-lg px-2.5 py-1 text-xs bg-background focus:outline-none focus:ring-1 focus:ring-teal-400 dark:focus:ring-teal-600 font-medium text-teal-700 dark:text-teal-300"
                    />
                    <span className="text-xs text-muted-foreground italic">
                      {item.precio !== '' && item.precioEspecial !== '' && Number(item.precio) > 0
                        ? `(antes ${formatNum(Number(item.precio))})`
                        : ''}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Acciones de fila */}
          <div className="mt-3 flex items-center gap-4 flex-wrap">
            <button
              onClick={addItem}
              className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <Plus size={13} /> Agregar fila
            </button>

            {!showDescuento ? (
              <button
                onClick={() => setShowDescuento(true)}
                className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <Percent size={13} /> Descuento Mayorista
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={descuentoPct}
                  onChange={(e) => setDescuentoPct(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') addDescuento(); if (e.key === 'Escape') setShowDescuento(false) }}
                  placeholder="% descuento"
                  min="1"
                  max="100"
                  autoFocus
                  className="w-28 border border-input rounded-lg px-2.5 py-1 text-xs bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  onClick={addDescuento}
                  className="text-xs font-medium bg-foreground text-primary-foreground px-3 py-1 rounded-lg hover:bg-foreground/90 transition-colors"
                >
                  Aplicar
                </button>
                <button
                  onClick={() => { setShowDescuento(false); setDescuentoPct('') }}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          El botón "Generar PDF / Imprimir" abre el diálogo de impresión del navegador. Elegí "Guardar como PDF" para exportarlo.
        </p>
      </div>

      {/* ── Preview / Template de impresión ── */}
      <div
        id="presupuesto-preview"
        className="mt-8 print:mt-0 rounded-xl overflow-hidden max-w-4xl mx-auto"
        style={{ fontFamily: 'Arial, sans-serif', fontSize: '12px', backgroundColor: '#ffffff', color: '#000000', border: '1px solid #e5e7eb' }}
      >
        {/* Logo */}
        <div style={{ backgroundColor: '#f0f0f0', textAlign: 'center', padding: '24px 0' }}>
          <Image
            src="/LogoDDDARG.png"
            alt="DDD ARG"
            width={160}
            height={100}
            style={{ height: '72px', width: 'auto', display: 'inline-block' }}
          />
        </div>

        {/* Empresa + Cliente */}
        <table style={{ width: '100%', borderCollapse: 'collapse', borderTop: `3px solid ${TEAL}` }}>
          <tbody>
            <tr>
              <td style={{ width: '50%', padding: '12px 16px', verticalAlign: 'top', borderRight: '1px solid #ccc', fontSize: '12px' }}>
                <p style={{ fontWeight: 'bold', marginBottom: '3px' }}>{EMPRESA.nombre}</p>
                <p style={{ marginBottom: '2px' }}>{EMPRESA.direccion}</p>
                <p style={{ marginBottom: '2px' }}>CUIT: {EMPRESA.cuit}</p>
                <p style={{ marginBottom: '2px' }}>Teléfono: {EMPRESA.telefono}</p>
                <p>E-mail: {EMPRESA.email}</p>
              </td>
              <td style={{ width: '50%', verticalAlign: 'top', fontSize: '12px' }}>
                <div style={{ backgroundColor: TEAL, color: 'white', textAlign: 'center', fontWeight: 'bold', padding: '6px', fontSize: '13px' }}>
                  Datos del cliente
                </div>
                <div style={{ padding: '12px 16px' }}>
                  <p style={{ marginBottom: '2px' }}>Nombre: {cliente.nombre}</p>
                  <p style={{ marginBottom: '2px' }}>Dirección: {cliente.direccion}</p>
                  <p style={{ marginBottom: '2px' }}>CUIT: {cliente.cuit}</p>
                  <p style={{ marginBottom: '2px' }}>Teléfono: {cliente.telefono}</p>
                  <p>E-mail: {cliente.email}</p>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Fecha + validez */}
        <table style={{ width: '100%', borderCollapse: 'collapse', borderTop: '1px solid #ccc' }}>
          <tbody>
            <tr style={{ fontSize: '12px' }}>
              <td style={{ padding: '8px 16px', width: '25%' }}>Fecha presupuesto:</td>
              <td style={{ padding: '8px 16px', width: '25%', borderRight: '1px solid #ccc' }}>{today()}</td>
              <td style={{ padding: '8px 16px', width: '25%' }}>Validez:</td>
              <td style={{ padding: '8px 16px', width: '25%' }}>{validez} días</td>
            </tr>
          </tbody>
        </table>

        {/* Tabla de items */}
        <table style={{ width: '100%', borderCollapse: 'collapse', borderTop: '1px solid #ccc', fontSize: '12px' }}>
          <thead>
            <tr style={{ backgroundColor: '#e8e8e8', textAlign: 'center', fontWeight: 'bold' }}>
              <th style={{ padding: '8px 12px', border: '1px solid #ccc', textAlign: 'left', width: '50%' }}>DESCRIPCIÓN</th>
              <th style={{ padding: '8px 12px', border: '1px solid #ccc', width: '15%' }}>UNIDADES</th>
              <th style={{ padding: '8px 12px', border: '1px solid #ccc', width: '17.5%' }}>PRECIO</th>
              <th style={{ padding: '8px 12px', border: '1px solid #ccc', width: '17.5%' }}>TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: PREVIEW_ROWS }).map((_, idx) => {
              const item = items[idx]
              const u = item ? Number(item.unidades) || 0 : 0
              const precioLista = item ? Number(item.precio) || 0 : 0
              const precioEfectivo = item?.precioEspecial !== undefined
                ? (Number(item.precioEspecial) || 0)
                : precioLista
              const rowTotal = u * precioEfectivo
              const hasData = item?.descripcion && item.descripcion.trim() !== ''
              const hasEspecial = hasData && item.precioEspecial !== undefined && item.precioEspecial !== ''
              return (
                <tr key={idx} style={{ textAlign: 'center' }}>
                  <td style={{ padding: '6px 12px', border: '1px solid #ccc', textAlign: 'left', height: '26px' }}>
                    {hasData ? item.descripcion : ''}
                  </td>
                  <td style={{ padding: '6px 12px', border: '1px solid #ccc' }}>
                    {hasData && item.unidades !== '' ? u : ''}
                  </td>
                  <td style={{ padding: '6px 12px', border: '1px solid #ccc' }}>
                    {hasEspecial ? (
                      <>
                        <span style={{ textDecoration: 'line-through', color: '#999', marginRight: '4px', fontSize: '11px' }}>
                          {formatNum(precioLista)}
                        </span>
                        <span style={{ color: '#c00', fontWeight: 'bold' }}>
                          {formatNum(precioEfectivo)}
                        </span>
                      </>
                    ) : (
                      hasData && item.precio !== '' ? formatNum(precioLista) : ''
                    )}
                  </td>
                  <td style={{ padding: '6px 12px', border: '1px solid #ccc' }}>
                    {hasData && rowTotal !== 0 ? formatNum(rowTotal) : ''}
                  </td>
                </tr>
              )
            })}

            {/* Sub-total */}
            <tr style={{ fontWeight: 'bold' }}>
              <td colSpan={2} style={{ padding: '6px 12px', border: '1px solid #ccc' }} />
              <td style={{ padding: '6px 12px', border: '1px solid #ccc', textAlign: 'center', fontWeight: 'bold' }}>
                SUB-TOTAL
              </td>
              <td style={{ padding: '6px 12px', border: '1px solid #ccc', textAlign: 'center' }}>
                {formatNum(subtotal)}
              </td>
            </tr>

            {/* Total */}
            <tr style={{ fontWeight: 'bold' }}>
              <td colSpan={2} style={{ padding: '6px 12px', border: '1px solid #ccc' }} />
              <td style={{ padding: '6px 12px', border: '1px solid #ccc', textAlign: 'center', fontWeight: 'bold' }}>
                TOTAL PRESUPUESTADO
              </td>
              <td style={{ padding: '6px 12px', border: '1px solid #ccc', textAlign: 'center', fontWeight: 'bold' }}>
                {formatNum(subtotal)}
              </td>
            </tr>
            {/* Condiciones de pago */}
            {condicionesPago.trim() && (
              <tr>
                <td colSpan={4} style={{ padding: '6px 12px', border: '1px solid #ccc', fontSize: '11px', color: '#555' }}>
                  <strong>Condiciones de pago:</strong> {condicionesPago}
                </td>
              </tr>
            )}
            {/* Consignación */}
            {esConsignacion && (
              <tr>
                <td colSpan={4} style={{ padding: '6px 12px', border: '1px solid #ccc', fontSize: '11px', color: '#7a5800', background: '#fffbea' }}>
                  <strong>Modalidad: CONSIGNACIÓN</strong> — Los productos se entregan en consignación. El cliente tiene <strong>{diasDevolucion} días</strong> desde la fecha de entrega para devolver los artículos no vendidos o abonar el importe correspondiente.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Espacio para firma */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '32px' }}>
          <tbody>
            {esConsignacion ? (
              <>
                <tr>
                  <td colSpan={2} style={{ padding: '4px 16px 12px', fontSize: '11px', color: '#7a5800', background: '#fffbea', border: '1px solid #e6c84a', borderRadius: '6px' }}>
                    <strong>Condiciones de consignación:</strong> El firmante declara recibir los productos detallados en calidad de consignación, comprometiéndose a devolver los artículos no vendidos o a abonar el precio acordado dentro de los {diasDevolucion} días corridos desde la fecha de entrega consignada en este documento.
                  </td>
                </tr>
                <tr>
                  <td style={{ width: '50%', padding: '24px 16px 16px', borderTop: `1px solid ${TEAL}`, textAlign: 'center', color: TEAL, fontSize: '11px' }}>
                    Firma y aclaración — Entrega (DDD ARG)
                  </td>
                  <td style={{ width: '50%', padding: '24px 16px 16px', borderTop: `1px solid ${TEAL}`, borderLeft: '1px solid #ccc', textAlign: 'center', color: TEAL, fontSize: '11px' }}>
                    Firma y aclaración — Recepción en consignación
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '4px 16px 8px', textAlign: 'center', fontSize: '10px', color: '#888' }}>
                    Fecha de entrega: ___/___/______
                  </td>
                  <td style={{ padding: '4px 16px 8px', textAlign: 'center', fontSize: '10px', color: '#888', borderLeft: '1px solid #ccc' }}>
                    Fecha límite devolución/pago: ___/___/______
                  </td>
                </tr>
              </>
            ) : (
              <tr>
                <td style={{ width: '50%', padding: '24px 16px 16px', borderTop: `1px solid ${TEAL}`, textAlign: 'center', color: TEAL, fontSize: '11px' }}>
                  Firma de la persona que confecciona el presupuesto
                </td>
                <td style={{ width: '50%', padding: '24px 16px 16px', borderTop: `1px solid ${TEAL}`, borderLeft: '1px solid #ccc', textAlign: 'center', color: TEAL, fontSize: '11px' }}>
                  Firma de aceptación del cliente
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Modal: Generar Pedido ── */}
      {showPedidoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="font-semibold text-base">Generar pedido desde presupuesto</h2>
              <button onClick={() => setShowPedidoModal(false)} className="p-1 hover:bg-secondary rounded transition-colors">
                <X size={16} />
              </button>
            </div>

            {pedidoResult?.orderId ? (
              /* ── Éxito ── */
              <div className="p-8 flex flex-col items-center gap-4 text-center">
                <CheckCircle size={48} className="text-green-500" />
                <p className="font-semibold text-lg">¡Pedido creado!</p>
                <p className="text-sm text-muted-foreground">
                  El pedido fue registrado correctamente en Ventas.
                </p>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => setShowPedidoModal(false)}
                    className="px-4 py-2 text-sm font-medium border border-border rounded-lg hover:bg-secondary transition-colors"
                  >
                    Cerrar
                  </button>
                  <a
                    href="/admin/ventas"
                    className="px-4 py-2 text-sm font-medium bg-foreground text-primary-foreground rounded-lg hover:bg-foreground/90 transition-colors"
                  >
                    Ver en Ventas
                  </a>
                </div>
              </div>
            ) : (
              /* ── Formulario ── */
              <div className="p-5 space-y-4">
                {/* Items resumen */}
                <div className="bg-secondary/50 rounded-lg p-3 space-y-1">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Ítems a incluir</p>
                  {items
                    .filter(i => i.descripcion.trim() && i.unidades !== '' && i.precio !== '')
                    .map((i, idx) => {
                      const total = (Number(i.unidades) || 0) * (Number(i.precio) || 0)
                      return (
                        <div key={idx} className="flex justify-between text-xs">
                          <span className="text-muted-foreground truncate">{i.descripcion} × {i.unidades}</span>
                          <span className={total < 0 ? 'text-red-500 font-medium' : 'font-medium'}>{formatARS(total)}</span>
                        </div>
                      )
                    })}
                  <div className="border-t border-border mt-2 pt-2 flex justify-between text-sm font-semibold">
                    <span>Total</span>
                    <span>{formatARS(subtotal)}</span>
                  </div>
                </div>

                {/* Cliente */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="text-xs font-medium block mb-1">Nombre del cliente *</label>
                    <input
                      value={pedidoForm.cliente_nombre}
                      onChange={e => setPedidoForm(f => ({ ...f, cliente_nombre: e.target.value }))}
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium block mb-1">Teléfono</label>
                    <input
                      value={pedidoForm.cliente_telefono}
                      onChange={e => setPedidoForm(f => ({ ...f, cliente_telefono: e.target.value }))}
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium block mb-1">E-mail</label>
                    <input
                      type="email"
                      value={pedidoForm.cliente_email}
                      onChange={e => setPedidoForm(f => ({ ...f, cliente_email: e.target.value }))}
                      className={INPUT_CLASS}
                    />
                  </div>
                </div>

                {/* Entrega */}
                <div>
                  <label className="text-xs font-medium block mb-1">Entrega *</label>
                  <select
                    value={pedidoForm.entrega}
                    onChange={e => setPedidoForm(f => ({ ...f, entrega: e.target.value as 'retiro' | 'envio' }))}
                    className={INPUT_CLASS}
                  >
                    <option value="retiro">Retiro en persona</option>
                    <option value="envio">Envío a domicilio</option>
                  </select>
                </div>
                {pedidoForm.entrega === 'envio' && (
                  <div>
                    <label className="text-xs font-medium block mb-1">Dirección de envío *</label>
                    <input
                      value={pedidoForm.direccion_envio}
                      onChange={e => setPedidoForm(f => ({ ...f, direccion_envio: e.target.value }))}
                      className={INPUT_CLASS}
                    />
                  </div>
                )}

                {/* Método de pago */}
                <div>
                  <label className="text-xs font-medium block mb-1">Método de pago *</label>
                  <select
                    value={pedidoForm.metodo_pago}
                    onChange={e => setPedidoForm(f => ({ ...f, metodo_pago: e.target.value as PedidoForm['metodo_pago'] }))}
                    className={INPUT_CLASS}
                  >
                    <option value="efectivo">Efectivo</option>
                    <option value="transferencia">Transferencia</option>
                    <option value="mercadopago">Mercado Pago</option>
                    <option value="whatsapp">WhatsApp</option>
                  </select>
                </div>

                {/* Nota */}
                <div>
                  <label className="text-xs font-medium block mb-1">Nota (opcional)</label>
                  <textarea
                    value={pedidoForm.nota}
                    onChange={e => setPedidoForm(f => ({ ...f, nota: e.target.value }))}
                    rows={2}
                    className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  />
                </div>

                {pedidoResult?.error && (
                  <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{pedidoResult.error}</p>
                )}

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => setShowPedidoModal(false)}
                    className="flex-1 px-4 py-2 text-sm font-medium border border-border rounded-lg hover:bg-secondary transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleCrearPedido}
                    disabled={pedidoLoading || !pedidoForm.cliente_nombre.trim()}
                    className="flex-1 px-4 py-2 text-sm font-medium bg-foreground text-primary-foreground rounded-lg hover:bg-foreground/90 disabled:opacity-50 transition-colors"
                  >
                    {pedidoLoading ? 'Creando...' : 'Confirmar pedido'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: cargar presupuesto guardado */}
      {showPresupuestosModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="font-semibold">Presupuestos guardados</h2>
              <button onClick={() => setShowPresupuestosModal(false)} className="text-muted-foreground hover:text-foreground">
                <X size={16} />
              </button>
            </div>
            <div className="overflow-y-auto flex-1">
              {loadingList ? (
                <p className="text-sm text-muted-foreground text-center py-10">Cargando...</p>
              ) : presupuestosList.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-10">No hay presupuestos guardados</p>
              ) : (
                <div className="divide-y divide-border">
                  {presupuestosList.map((p) => (
                    <div key={p.id} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-secondary/20">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          {p.numero && <span className="text-xs font-bold text-muted-foreground">#{p.numero}</span>}
                          <p className="font-medium text-sm truncate">{p.cliente_nombre || '(sin nombre)'}</p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {p.items.length} ítems ·{' '}
                          {new Date(p.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                          {p.condiciones_pago && <span className="ml-1 italic">· {p.condiciones_pago}</span>}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleLoadPresupuesto(p)}
                          className="text-xs px-3 py-1.5 rounded-lg bg-foreground text-background hover:opacity-90 transition-opacity"
                        >
                          Cargar
                        </button>
                        <button
                          onClick={() => handleDuplicarPresupuesto(p.id)}
                          className="text-xs px-2.5 py-1.5 rounded-lg border border-border hover:bg-secondary transition-colors"
                          title="Duplicar"
                        >
                          📋
                        </button>
                        <button
                          onClick={() => handleDeletePresupuesto(p.id)}
                          className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
