'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Plus, Trash2, Printer } from 'lucide-react'

interface Item {
  descripcion: string
  unidades: number | ''
  precio: number | ''
}

const EMPRESA = {
  nombre: 'Arnaudo Juan Pablo',
  direccion: 'Adolfo E DÃ¡vila 279 - La Rioja',
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

export default function PresupuestoClient() {
  const [cliente, setCliente] = useState({
    nombre: '', direccion: '', cuit: '', telefono: '', email: '',
  })
  const [validez, setValidez] = useState(10)
  const [items, setItems] = useState<Item[]>([
    { descripcion: '', unidades: '', precio: '' },
    { descripcion: '', unidades: '', precio: '' },
  ])

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

  const subtotal = items.reduce((s, i) => {
    const u = Number(i.unidades) || 0
    const p = Number(i.precio) || 0
    return s + u * p
  }, 0)

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

      {/* â”€â”€ Formulario (oculto al imprimir) â”€â”€ */}
      <div className="print:hidden space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-2xl font-bold">ðŸ“‹ Presupuesto</h1>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-foreground text-primary-foreground hover:bg-foreground/90 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Printer size={15} />
            Generar PDF / Imprimir
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Datos del cliente */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-3">
            <h3 className="font-semibold text-sm">Datos del cliente</h3>
            {(
              [
                { field: 'nombre', label: 'Nombre' },
                { field: 'direccion', label: 'DirecciÃ³n' },
                { field: 'cuit', label: 'CUIT' },
                { field: 'telefono', label: 'TelÃ©fono' },
                { field: 'email', label: 'E-mail' },
              ] as { field: keyof typeof cliente; label: string }[]
            ).map(({ field, label }) => (
              <div key={field}>
                <label className="text-xs font-medium block mb-1">{label}</label>
                <input
                  value={cliente[field]}
                  onChange={(e) => updateCliente(field, e.target.value)}
                  className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            ))}
          </div>

          {/* Config */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-3">
            <h3 className="font-semibold text-sm">Opciones</h3>
            <div>
              <label className="text-xs font-medium block mb-1">Validez (dÃ­as)</label>
              <input
                type="number"
                min="1"
                value={validez}
                onChange={(e) => setValidez(Number(e.target.value))}
                className="w-32 border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              UsÃ¡ precios negativos para agregar descuentos.<br />
              Ej: precio <code className="bg-secondary px-1 rounded">-800</code> â†’ descuento
            </p>
          </div>
        </div>

        {/* Items */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-semibold text-sm mb-4">Productos / servicios</h3>
          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground px-1">
              <div className="col-span-6">DescripciÃ³n</div>
              <div className="col-span-2 text-center">Unidades</div>
              <div className="col-span-3">Precio unitario $</div>
              <div className="col-span-1" />
            </div>
            {items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-6">
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
                    className="w-full border border-input rounded-lg px-2.5 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="col-span-1 flex justify-center">
                  <button
                    onClick={() => removeItem(idx)}
                    disabled={items.length <= 1}
                    className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive disabled:opacity-30 transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={addItem}
            className="mt-3 flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <Plus size={13} /> Agregar fila
          </button>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          El botÃ³n "Generar PDF / Imprimir" abre el diÃ¡logo de impresiÃ³n del navegador. ElegÃ­ "Guardar como PDF" para exportarlo.
        </p>
      </div>

      {/* â”€â”€ Preview / Template de impresiÃ³n â”€â”€ */}
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
                <p style={{ marginBottom: '2px' }}>TelÃ©fono: {EMPRESA.telefono}</p>
                <p>E-mail: {EMPRESA.email}</p>
              </td>
              <td style={{ width: '50%', verticalAlign: 'top', fontSize: '12px' }}>
                <div style={{ backgroundColor: TEAL, color: 'white', textAlign: 'center', fontWeight: 'bold', padding: '6px', fontSize: '13px' }}>
                  Datos del cliente
                </div>
                <div style={{ padding: '12px 16px' }}>
                  <p style={{ marginBottom: '2px' }}>Nombre: {cliente.nombre}</p>
                  <p style={{ marginBottom: '2px' }}>DirecciÃ³n: {cliente.direccion}</p>
                  <p style={{ marginBottom: '2px' }}>CUIT: {cliente.cuit}</p>
                  <p style={{ marginBottom: '2px' }}>TelÃ©fono: {cliente.telefono}</p>
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
              <td style={{ padding: '8px 16px', width: '25%' }}>Validez: {validez} dÃ­as</td>
            </tr>
          </tbody>
        </table>

        {/* Tabla de items */}
        <table style={{ width: '100%', borderCollapse: 'collapse', borderTop: '1px solid #ccc', fontSize: '12px' }}>
          <thead>
            <tr style={{ backgroundColor: '#e8e8e8', textAlign: 'center', fontWeight: 'bold' }}>
              <th style={{ padding: '8px 12px', border: '1px solid #ccc', textAlign: 'left', width: '50%' }}>DESCRIPCIÃ“N</th>
              <th style={{ padding: '8px 12px', border: '1px solid #ccc', width: '15%' }}>UNIDADES</th>
              <th style={{ padding: '8px 12px', border: '1px solid #ccc', width: '17.5%' }}>PRECIO</th>
              <th style={{ padding: '8px 12px', border: '1px solid #ccc', width: '17.5%' }}>TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: PREVIEW_ROWS }).map((_, idx) => {
              const item = items[idx]
              const u = item ? Number(item.unidades) || 0 : 0
              const p = item ? Number(item.precio) || 0 : 0
              const rowTotal = u * p
              const hasData = item?.descripcion && item.descripcion.trim() !== ''
              return (
                <tr key={idx} style={{ textAlign: 'center' }}>
                  <td style={{ padding: '6px 12px', border: '1px solid #ccc', textAlign: 'left', height: '26px' }}>
                    {hasData ? item.descripcion : ''}
                  </td>
                  <td style={{ padding: '6px 12px', border: '1px solid #ccc' }}>
                    {hasData && item.unidades !== '' ? u : ''}
                  </td>
                  <td style={{ padding: '6px 12px', border: '1px solid #ccc' }}>
                    {hasData && item.precio !== '' ? formatNum(p) : ''}
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
                Firma de aceptaciÃ³n del cliente
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
