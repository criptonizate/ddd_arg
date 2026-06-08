'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Plus, Trash2, Printer, ShoppingCart, X, Percent, CheckCircle } from 'lucide-react'
import { createManualSale } from '@/lib/actions/orders'
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

export default function PresupuestoClient() {
  const [cliente, setCliente] = useState({
    nombre: '', direccion: '', cuit: '', telefono: '', email: '',
  })
  const [validez, setValidez] = useState(10)
  const [items, setItems] = useState<Item[]>([
    { descripcion: '', unidades: '', precio: '' },
    { descripcion: '', unidades: '', precio: '' },
  ])

  // Descuento mayorista
  const [showDescuento, setShowDescuento] = useState(false)
  const [descuentoPct, setDescuentoPct] = useState('')

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
              onClick={openPedidoModal}
              className="flex items-center gap-2 border border-border hover:bg-secondary px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <ShoppingCart size={15} />
              Generar pedido
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
          </div>
        </div>

        {/* Items */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-semibold text-sm mb-4">Productos / servicios</h3>
          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground px-1">
              <div className="col-span-5">Descripción</div>
              <div className="col-span-2 text-center">Unidades</div>
              <div className="col-span-3">Precio unitario $</div>
              <div className="col-span-2" />
            </div>
            {items.map((item, idx) => (
              <div key={idx} className="space-y-1">
                <div className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-5">
                    <input
                      value={item.descripcion}
                      onChange={(e) => updateItem(idx, 'descripcion', e.target.value)}
                      placeholder="Ej: Escarapelas personalizadas"
                      className="w-full border border-input rounded-lg px-2.5 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      value={item.unidades}
                      onChange={(e) => updateItem(idx, 'unidades', e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="0"
                      className="w-full border border-input rounded-lg px-2.5 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring text-center"
                    />
                  </div>
                  <div className="col-span-3">
                    <input
                      type="number"
                      value={item.precio}
                      onChange={(e) => updateItem(idx, 'precio', e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="0"
                      className={`w-full border border-input rounded-lg px-2.5 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring ${item.precioEspecial !== undefined ? 'line-through text-muted-foreground' : ''}`}
                    />
                  </div>
                  <div className="col-span-2 flex justify-center gap-1">
                    <button
                      onClick={() => togglePrecioEspecial(idx)}
                      title="Precio especial / descuento"
                      className={`p-1.5 rounded transition-colors text-xs font-bold ${item.precioEspecial !== undefined ? 'bg-teal-100 text-teal-700 hover:bg-teal-200' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}
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
                    <span className="text-xs text-teal-700 font-medium shrink-0">Precio especial:</span>
                    <input
                      type="number"
                      value={item.descuentoPct ?? ''}
                      onChange={(e) => updatePrecioEspecialPct(idx, e.target.value)}
                      placeholder="% desc."
                      min="1"
                      max="100"
                      className="w-20 border border-teal-300 rounded-lg px-2 py-1 text-xs bg-background focus:outline-none focus:ring-1 focus:ring-teal-400 text-center"
                    />
                    <span className="text-xs text-muted-foreground">%  →</span>
                    <input
                      type="number"
                      value={item.precioEspecial}
                      onChange={(e) => updatePrecioEspecialDirecto(idx, e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="$0"
                      className="w-28 border border-teal-300 rounded-lg px-2.5 py-1 text-xs bg-background focus:outline-none focus:ring-1 focus:ring-teal-400 font-medium text-teal-700"
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
        className="mt-8 print:mt-0 bg-white text-black border border-gray-200 rounded-xl overflow-hidden max-w-4xl mx-auto"
        style={{ fontFamily: 'Arial, sans-serif', fontSize: '12px' }}
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
              <td style={{ padding: '8px 16px', width: '25%' }} />
              <td style={{ padding: '8px 16px', width: '25%' }}>Validez: {validez} días</td>
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
          </tbody>
        </table>

        {/* Espacio para firma */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '32px' }}>
          <tbody>
            <tr>
              <td style={{ width: '50%', padding: '24px 16px 16px', borderTop: `1px solid ${TEAL}`, textAlign: 'center', color: TEAL, fontSize: '11px' }}>
                Firma de la persona que confecciona el presupuesto
              </td>
              <td style={{ width: '50%', padding: '24px 16px 16px', borderTop: `1px solid ${TEAL}`, borderLeft: '1px solid #ccc', textAlign: 'center', color: TEAL, fontSize: '11px' }}>
                Firma de aceptación del cliente
              </td>
            </tr>
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
    </div>
  )
}
