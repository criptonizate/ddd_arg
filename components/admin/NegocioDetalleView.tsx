'use client'

import { useState, useTransition } from 'react'
import { formatARS } from '@/lib/utils'
import { ChevronDown, ChevronUp, Trash2, Plus, X, Check, TrendingDown, PackagePlus, Pencil } from 'lucide-react'
import {
  markPedidoEntregado,
  deleteNegocioPedido,
  addItemsToPedido,
  deleteNegocioItem,
  createEgresosNegocio,
  deleteEgresoNegocio,
  createNegocioPedido,
  updatePedidoCompleto,
} from '@/lib/actions/negocios'
import type { Negocio, NegocioPedido, NegocioEgreso } from '@/lib/actions/negocios'
import { useConfirm } from './ConfirmModal'
import { useToast } from './ToastProvider'

// ── Helpers ────────────────────────────────────────────────────────────────

function formatFecha(fecha: string) {
  return new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(
    new Date(fecha.length === 10 ? fecha + 'T12:00:00' : fecha)
  )
}

function pedidoTotal(pedido: NegocioPedido) {
  return pedido.negocio_items.reduce((s, i) => s + Number(i.precio_mayorista) * i.cantidad, 0)
}

interface StockRow {
  nombre: string
  recibido: number
  vendido: number
  devuelto: number
  stock: number
  precio: number
}

function computeStock(negocio: Negocio): StockRow[] {
  const received = new Map<string, { qty: number; precio: number; nombre: string }>()
  for (const pedido of negocio.negocio_pedidos) {
    for (const item of pedido.negocio_items) {
      const key = item.nombre_producto.toLowerCase().trim()
      const cur = received.get(key) ?? { qty: 0, precio: Number(item.precio_mayorista), nombre: item.nombre_producto }
      cur.qty += item.cantidad
      received.set(key, cur)
    }
  }
  const egresado = new Map<string, { vendido: number; devuelto: number }>()
  for (const e of negocio.negocio_egresos) {
    const key = e.nombre_producto.toLowerCase().trim()
    const cur = egresado.get(key) ?? { vendido: 0, devuelto: 0 }
    if (e.tipo === 'vendido') cur.vendido += e.cantidad
    else cur.devuelto += e.cantidad
    egresado.set(key, cur)
  }
  return Array.from(received.entries())
    .map(([key, r]) => {
      const eg = egresado.get(key) ?? { vendido: 0, devuelto: 0 }
      return { nombre: r.nombre, recibido: r.qty, vendido: eg.vendido, devuelto: eg.devuelto, stock: r.qty - eg.vendido - eg.devuelto, precio: r.precio }
    })
    .sort((a, b) => a.nombre.localeCompare(b.nombre))
}

// ── PDF Export ─────────────────────────────────────────────────────────────

function exportStockPDF(stock: StockRow[], negocioNombre: string) {
  const fecha = new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date())
  const rows = stock.map((r) => `
    <tr>
      <td>${r.nombre}</td>
      <td style="text-align:center">${r.recibido}</td>
      <td style="text-align:center">${r.vendido || '—'}</td>
      <td style="text-align:center">${r.devuelto || '—'}</td>
      <td style="text-align:center;font-weight:bold;color:${r.stock <= 0 ? '#dc2626' : r.stock <= 3 ? '#ea580c' : '#16a34a'}">${r.stock <= 0 ? '0 ⚠' : r.stock}</td>
      <td style="text-align:right">$${Number(r.precio).toLocaleString('es-AR')}</td>
    </tr>`).join('')
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Stock ${negocioNombre}</title>
    <style>
      body{font-family:Arial,sans-serif;margin:32px;color:#111}
      h1{font-size:20px;margin:0}p{font-size:12px;color:#555;margin:4px 0 20px}
      table{width:100%;border-collapse:collapse;font-size:13px}
      th{background:#f3f4f6;padding:8px 12px;text-align:left;font-weight:600;border-bottom:2px solid #e5e7eb}
      td{padding:7px 12px;border-bottom:1px solid #e5e7eb}
      tr:last-child td{border-bottom:none}
      @media print{body{margin:16px}}
    </style></head><body>
    <h1>📦 Stock — ${negocioNombre}</h1>
    <p>Generado el ${fecha}</p>
    <table><thead><tr>
      <th>Producto</th><th style="text-align:center">Recibido</th>
      <th style="text-align:center">Vendido</th><th style="text-align:center">Devuelto</th>
      <th style="text-align:center">En stock</th><th style="text-align:right">Precio may.</th>
    </tr></thead><tbody>${rows}</tbody></table>
    </body></html>`
  const win = window.open('', '_blank')
  if (win) { win.document.write(html); win.document.close(); win.focus(); win.print() }
}

// ── Modal: Registrar múltiples egresos ─────────────────────────────────────

interface EgresoItem { producto: string; tipo: 'vendido' | 'devuelto'; cantidad: number; fecha: string; nota: string }

function MultiEgresoModal({
  negocioId,
  productosDisponibles,
  productoInicial,
  onClose,
}: {
  negocioId: string
  productosDisponibles: string[]
  productoInicial?: string
  onClose: () => void
}) {
  const hoy = new Date().toISOString().split('T')[0]
  const [lista, setLista] = useState<EgresoItem[]>([])
  const [producto, setProducto] = useState(productoInicial ?? '')
  const [tipo, setTipo] = useState<'vendido' | 'devuelto'>('vendido')
  const [cantidad, setCantidad] = useState(1)
  const [fecha, setFecha] = useState(hoy)
  const [nota, setNota] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const listId = 'egreso-productos-list'

  function addItem() {
    if (!producto.trim()) { setError('Escribí un producto'); return }
    if (cantidad < 1) { setError('La cantidad debe ser ≥ 1'); return }
    setError(null)
    setLista((prev) => [...prev, { producto: producto.trim(), tipo, cantidad, fecha, nota }])
    setProducto(productoInicial ?? '')
    setCantidad(1)
    setNota('')
  }

  function handleSubmit() {
    if (!lista.length) { setError('Agregá al menos un egreso'); return }
    startTransition(async () => {
      const res = await createEgresosNegocio(negocioId, lista.map((i) => ({
        nombre_producto: i.producto,
        tipo: i.tipo,
        cantidad: i.cantidad,
        fecha: i.fecha,
        nota: i.nota,
      })))
      if (res?.error) { setError(res.error); return }
      onClose()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-card rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-semibold flex items-center gap-2"><TrendingDown size={16} /> Registrar egresos</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary"><X size={15} /></button>
        </div>

        <div className="p-5 space-y-4">
          {error && <p className="text-sm text-destructive">{error}</p>}

          {/* Datalist para autocompletado */}
          <datalist id={listId}>
            {productosDisponibles.map((p) => <option key={p} value={p} />)}
          </datalist>

          {/* Formulario de un ítem */}
          <div className="bg-secondary/20 rounded-xl p-4 space-y-3">
            <div>
              <label className="text-xs font-medium mb-1 block">Producto</label>
              <input
                value={producto}
                onChange={(e) => setProducto(e.target.value)}
                list={listId}
                className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Nombre del producto..."
                autoFocus={!productoInicial}
              />
            </div>
            <div className="flex gap-2">
              {(['vendido', 'devuelto'] as const).map((t) => (
                <button key={t} onClick={() => setTipo(t)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${tipo === t ? 'bg-foreground text-primary-foreground border-foreground' : 'border-border hover:bg-secondary'}`}>
                  {t === 'vendido' ? '📤 Vendido' : '↩ Devuelto'}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs font-medium mb-1 block">Cantidad</label>
                <input type="number" min="1" value={cantidad} onChange={(e) => setCantidad(Number(e.target.value))}
                  className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Fecha</label>
                <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)}
                  className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Nota</label>
                <input value={nota} onChange={(e) => setNota(e.target.value)}
                  className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Opcional" />
              </div>
            </div>
            <button onClick={addItem} className="w-full py-2 rounded-lg text-sm font-medium bg-secondary hover:bg-secondary/80 border border-border transition-colors flex items-center justify-center gap-2">
              <Plus size={14} /> Agregar a la lista
            </button>
          </div>

          {/* Lista de egresos a registrar */}
          {lista.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">A registrar ({lista.length})</p>
              {lista.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between gap-2 px-3 py-2.5 bg-secondary/30 rounded-lg text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium shrink-0 ${item.tipo === 'vendido' ? 'bg-orange-100 text-orange-800 border-orange-200' : 'bg-blue-100 text-blue-800 border-blue-200'}`}>
                      {item.tipo === 'vendido' ? '📤' : '↩'} {item.tipo}
                    </span>
                    <span className="font-medium truncate">{item.producto}</span>
                    <span className="text-muted-foreground shrink-0">× {item.cantidad}</span>
                    {item.nota && <span className="text-xs text-muted-foreground italic truncate">— {item.nota}</span>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground">{formatFecha(item.fecha)}</span>
                    <button onClick={() => setLista((p) => p.filter((_, i) => i !== idx))} className="p-1 rounded hover:bg-secondary">
                      <Trash2 size={11} className="text-muted-foreground" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 p-5 border-t border-border">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium border border-border hover:bg-secondary transition-colors">Cancelar</button>
          <button onClick={handleSubmit} disabled={isPending || lista.length === 0}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-foreground text-primary-foreground hover:bg-foreground/90 disabled:opacity-60 transition-colors">
            {isPending ? 'Guardando...' : `Registrar ${lista.length > 0 ? `(${lista.length})` : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal: Carga rápida de stock (nuevo pedido de 1 producto) ──────────────

function CargaRapidaModal({
  negocioId,
  productoInicial,
  productosDisponibles,
  onClose,
}: {
  negocioId: string
  productoInicial: string
  productosDisponibles: string[]
  onClose: () => void
}) {
  const listId = 'carga-productos-list'
  const [producto, setProducto] = useState(productoInicial)
  const [precio, setPrecio] = useState(0)
  const [cantidad, setCantidad] = useState(1)
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit() {
    setError(null)
    if (!producto.trim()) { setError('El nombre del producto es obligatorio'); return }
    if (cantidad < 1) { setError('La cantidad debe ser mayor a 0'); return }
    startTransition(async () => {
      const res = await createNegocioPedido({
        negocio_id: negocioId,
        fecha,
        items: [{ nombre_producto: producto.trim(), precio_mayorista: precio, cantidad }],
      })
      if (res?.error) { setError(res.error); return }
      onClose()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-card rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-semibold flex items-center gap-2"><PackagePlus size={16} /> Cargar stock</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary"><X size={15} /></button>
        </div>
        <div className="p-5 space-y-4">
          {error && <p className="text-sm text-destructive">{error}</p>}
          <datalist id={listId}>
            {productosDisponibles.map((p) => <option key={p} value={p} />)}
          </datalist>
          <div>
            <label className="text-xs font-medium mb-1 block">Producto</label>
            <input
              value={producto}
              onChange={(e) => setProducto(e.target.value)}
              list={listId}
              className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium mb-1 block">Precio mayorista</label>
              <input type="number" min="0" value={precio || ''} onChange={(e) => setPrecio(Number(e.target.value))}
                className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" placeholder="0" />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Cantidad</label>
              <input type="number" min="1" value={cantidad} onChange={(e) => setCantidad(Number(e.target.value))}
                className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">Fecha</label>
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)}
              className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
        </div>
        <div className="flex justify-end gap-3 p-5 border-t border-border">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium border border-border hover:bg-secondary transition-colors">Cancelar</button>
          <button onClick={handleSubmit} disabled={isPending}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-foreground text-primary-foreground hover:bg-foreground/90 disabled:opacity-60 transition-colors">
            {isPending ? 'Guardando...' : 'Cargar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Sección de stock ───────────────────────────────────────────────────────

function StockSection({ negocio }: { negocio: Negocio }) {
  const stock = computeStock(negocio)
  const [egresoProducto, setEgresoProducto] = useState<string | null>(null)
  const [cargaProducto, setCargaProducto] = useState<string | null>(null)
  const [showHistorial, setShowHistorial] = useState(false)
  const [isPending, startTransition] = useTransition()
  const { confirm, ConfirmDialog } = useConfirm()
  const { toast } = useToast()

  const productosNombres = stock.map((s) => s.nombre)

  async function handleDeleteEgreso(id: string) {
    const ok = await confirm('¿Eliminar este egreso?', { confirmLabel: 'Eliminar' })
    if (!ok) return
    startTransition(async () => {
      const res = await deleteEgresoNegocio(id, negocio.id)
      if (res?.error) toast(res.error, 'error')
    })
  }

  if (stock.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-5">
        <h2 className="font-semibold mb-1">📦 Stock actual</h2>
        <p className="text-sm text-muted-foreground">Sin productos cargados. Usá "Nuevo pedido" para agregar.</p>
      </div>
    )
  }

  return (
    <>
      {ConfirmDialog}
      {egresoProducto !== null && (
        <MultiEgresoModal
          negocioId={negocio.id}
          productosDisponibles={productosNombres}
          productoInicial={egresoProducto || undefined}
          onClose={() => setEgresoProducto(null)}
        />
      )}
      {cargaProducto !== null && (
        <CargaRapidaModal
          negocioId={negocio.id}
          productoInicial={cargaProducto}
          productosDisponibles={productosNombres}
          onClose={() => setCargaProducto(null)}
        />
      )}

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-wrap gap-2">
          <h2 className="font-semibold">📦 Stock actual</h2>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowHistorial(!showHistorial)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {showHistorial ? 'Ocultar historial' : 'Ver historial'}
            </button>
            <button
              onClick={() => exportStockPDF(stock, negocio.nombre)}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-border hover:bg-secondary transition-colors"
            >
              📄 Exportar PDF
            </button>
            <button
              onClick={() => setEgresoProducto('')}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-border hover:bg-secondary transition-colors"
            >
              <TrendingDown size={12} /> Registrar egresos
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground border-b border-border">
                <th className="text-left px-5 py-3 font-medium">Producto</th>
                <th className="text-right px-3 py-3 font-medium">Recibido</th>
                <th className="text-right px-3 py-3 font-medium">Vendido</th>
                <th className="text-right px-3 py-3 font-medium">Devuelto</th>
                <th className="text-right px-3 py-3 font-medium">En stock</th>
                <th className="px-3 py-3 w-32" />
              </tr>
            </thead>
            <tbody>
              {stock.map((row) => {
                const agotado = row.stock <= 0
                const bajo = row.stock > 0 && row.stock <= 3
                return (
                  <tr key={row.nombre} className="border-b border-border/50 last:border-0">
                    <td className="px-5 py-3 font-medium">{row.nombre}</td>
                    <td className="px-3 py-3 text-right text-muted-foreground">{row.recibido}</td>
                    <td className="px-3 py-3 text-right text-muted-foreground">{row.vendido > 0 ? row.vendido : '—'}</td>
                    <td className="px-3 py-3 text-right text-muted-foreground">{row.devuelto > 0 ? row.devuelto : '—'}</td>
                    <td className="px-3 py-3 text-right">
                      <span className={`font-bold ${agotado ? 'text-red-600' : bajo ? 'text-orange-600' : 'text-green-600'}`}>
                        {agotado ? '0 ⚠ agotado' : row.stock}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex gap-1.5 justify-end">
                        <button
                          onClick={() => setEgresoProducto(row.nombre)}
                          className="flex items-center gap-1 text-xs px-2 py-1 rounded border border-border hover:bg-secondary transition-colors"
                          title="Registrar egreso"
                        >
                          <TrendingDown size={11} /> Egresar
                        </button>
                        <button
                          onClick={() => setCargaProducto(row.nombre)}
                          className="flex items-center gap-1 text-xs px-2 py-1 rounded border border-border hover:bg-secondary transition-colors"
                          title="Cargar más stock"
                        >
                          <Plus size={11} /> Cargar
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Historial de egresos */}
        {showHistorial && negocio.negocio_egresos.length > 0 && (
          <div className="border-t border-border px-5 py-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Historial de egresos</h3>
            <div className="space-y-1.5">
              {negocio.negocio_egresos.map((e) => (
                <div key={e.id} className="flex items-center justify-between gap-3 text-sm py-1">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                      e.tipo === 'vendido'
                        ? 'bg-orange-100 text-orange-800 border-orange-200'
                        : 'bg-blue-100 text-blue-800 border-blue-200'
                    }`}>
                      {e.tipo === 'vendido' ? '📤 Vendido' : '↩ Devuelto'}
                    </span>
                    <span className="font-medium truncate">{e.nombre_producto}</span>
                    <span className="text-muted-foreground">× {e.cantidad}</span>
                    {e.nota && <span className="text-xs text-muted-foreground italic truncate">— {e.nota}</span>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground">{formatFecha(e.fecha)}</span>
                    <button
                      onClick={() => handleDeleteEgreso(e.id)}
                      disabled={isPending}
                      className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {showHistorial && negocio.negocio_egresos.length === 0 && (
          <div className="border-t border-border px-5 py-4">
            <p className="text-sm text-muted-foreground">Sin egresos registrados aún.</p>
          </div>
        )}
      </div>
    </>
  )
}

// ── Modal: Cargar egreso para marcar pedido como entregado ─────────────────

function EntregaModal({ pedido, negocioId, onClose }: { pedido: NegocioPedido; negocioId: string; onClose: () => void }) {
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit() {
    startTransition(async () => {
      const res = await markPedidoEntregado(pedido.id, negocioId, fecha)
      if (res?.error) { setError(res.error); return }
      onClose()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-card rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-semibold">✅ Marcar como entregado</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary"><X size={15} /></button>
        </div>
        <div className="p-5 space-y-4">
          {error && <p className="text-sm text-destructive">{error}</p>}
          <p className="text-sm text-muted-foreground">Pedido del <strong>{formatFecha(pedido.fecha)}</strong></p>
          <div className="bg-secondary/30 rounded-lg p-3 space-y-1 text-sm">
            {pedido.negocio_items.map((i) => (
              <div key={i.id} className="flex justify-between">
                <span>{i.nombre_producto} × {i.cantidad}</span>
                <span className="font-medium">{formatARS(Number(i.precio_mayorista) * i.cantidad)}</span>
              </div>
            ))}
            <div className="flex justify-between border-t border-border pt-1 font-bold">
              <span>Total</span><span>{formatARS(pedidoTotal(pedido))}</span>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">📅 Fecha de entrega</label>
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)}
              className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
        </div>
        <div className="flex justify-end gap-3 p-5 border-t border-border">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium border border-border hover:bg-secondary transition-colors">Cancelar</button>
          <button onClick={handleSubmit} disabled={isPending}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-foreground text-primary-foreground hover:bg-foreground/90 disabled:opacity-60 transition-colors">
            {isPending ? 'Guardando...' : 'Confirmar entrega'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal: Agregar items a pedido ──────────────────────────────────────────

function AgregarItemsModal({ pedido, negocioId, onClose }: { pedido: NegocioPedido; negocioId: string; onClose: () => void }) {
  const [items, setItems] = useState<{ nombre_producto: string; precio_mayorista: number; cantidad: number }[]>([])
  const [nombre, setNombre] = useState('')
  const [precio, setPrecio] = useState(0)
  const [cantidad, setCantidad] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function addItem() {
    if (!nombre.trim()) return
    setItems((p) => [...p, { nombre_producto: nombre.trim(), precio_mayorista: precio, cantidad }])
    setNombre(''); setPrecio(0); setCantidad(1)
  }
  function handleSubmit() {
    setError(null)
    if (!items.length) { setError('Agregá al menos un producto'); return }
    startTransition(async () => {
      const res = await addItemsToPedido(pedido.id, negocioId, items)
      if (res?.error) { setError(res.error); return }
      onClose()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-card rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h2 className="font-semibold">+ Agregar productos</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Pedido del {formatFecha(pedido.fecha)}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary"><X size={15} /></button>
        </div>
        <div className="p-5 space-y-4">
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="grid grid-cols-12 gap-2">
            <div className="col-span-12">
              <input value={nombre} onChange={(e) => setNombre(e.target.value)}
                className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Nombre del producto" onKeyDown={(e) => e.key === 'Enter' && addItem()} />
            </div>
            <div className="col-span-5">
              <input type="number" min="0" value={precio || ''} onChange={(e) => setPrecio(Number(e.target.value))}
                className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Precio mayorista" />
            </div>
            <div className="col-span-4">
              <input type="number" min="1" value={cantidad} onChange={(e) => setCantidad(Number(e.target.value))}
                className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Cantidad" />
            </div>
            <div className="col-span-3 flex">
              <button onClick={addItem} disabled={!nombre.trim()}
                className="w-full py-2 rounded-lg bg-foreground text-primary-foreground hover:bg-foreground/90 disabled:opacity-40 flex items-center justify-center gap-1 text-sm">
                <Plus size={13} /> Agregar
              </button>
            </div>
          </div>
          {items.length > 0 && (
            <div className="space-y-1.5">
              {items.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between gap-2 p-2.5 bg-secondary/30 rounded-lg text-sm">
                  <span className="font-medium">{item.nombre_producto}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-xs">{formatARS(item.precio_mayorista)} × {item.cantidad}</span>
                    <span className="font-semibold">{formatARS(item.precio_mayorista * item.cantidad)}</span>
                    <button onClick={() => setItems((p) => p.filter((_, i) => i !== idx))} className="p-1 rounded hover:bg-secondary">
                      <Trash2 size={11} className="text-muted-foreground" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3 p-5 border-t border-border">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium border border-border hover:bg-secondary transition-colors">Cancelar</button>
          <button onClick={handleSubmit} disabled={isPending || items.length === 0}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-foreground text-primary-foreground hover:bg-foreground/90 disabled:opacity-60 transition-colors">
            {isPending ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal: Editar pedido (fecha, nota, precios, cantidades) ────────────────

function EditarPedidoModal({ pedido, negocioId, onClose }: { pedido: NegocioPedido; negocioId: string; onClose: () => void }) {
  const [fecha, setFecha] = useState(pedido.fecha.slice(0, 10))
  const [nota, setNota] = useState(pedido.nota ?? '')
  const [items, setItems] = useState(
    pedido.negocio_items.map((i) => ({
      id: i.id,
      nombre_producto: i.nombre_producto,
      precio_mayorista: Number(i.precio_mayorista),
      cantidad: i.cantidad,
    }))
  )
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function setItemField(idx: number, field: 'precio_mayorista' | 'cantidad', value: number) {
    setItems((prev) => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item))
  }

  function handleSubmit() {
    setError(null)
    if (!fecha) { setError('La fecha es obligatoria'); return }
    startTransition(async () => {
      const res = await updatePedidoCompleto(pedido.id, negocioId, { fecha, nota, items })
      if (res?.error) { setError(res.error); return }
      onClose()
    })
  }

  const total = items.reduce((s, i) => s + i.precio_mayorista * i.cantidad, 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-card rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-semibold flex items-center gap-2"><Pencil size={15} /> Editar pedido</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary"><X size={15} /></button>
        </div>
        <div className="p-5 space-y-5">
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium mb-1 block">Fecha del pedido</label>
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)}
                className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Nota</label>
              <input value={nota} onChange={(e) => setNota(e.target.value)}
                className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Opcional" />
            </div>
          </div>
          {items.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Productos</p>
              <div className="space-y-2">
                <div className="grid grid-cols-12 gap-2 text-xs text-muted-foreground font-medium px-1 mb-1">
                  <div className="col-span-5">Producto</div>
                  <div className="col-span-3">Precio may.</div>
                  <div className="col-span-2">Cant.</div>
                  <div className="col-span-2 text-right">Subtotal</div>
                </div>
                {items.map((item, idx) => (
                  <div key={item.id} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-5 text-sm font-medium truncate" title={item.nombre_producto}>{item.nombre_producto}</div>
                    <div className="col-span-3">
                      <input
                        type="number" min="0" value={item.precio_mayorista || ''}
                        onChange={(e) => setItemField(idx, 'precio_mayorista', Number(e.target.value))}
                        className="w-full border border-input rounded-lg px-2 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                        placeholder="Precio"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number" min="1" value={item.cantidad}
                        onChange={(e) => setItemField(idx, 'cantidad', Math.max(1, Number(e.target.value)))}
                        className="w-full border border-input rounded-lg px-2 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    <div className="col-span-2 text-right text-sm font-semibold">
                      {formatARS(item.precio_mayorista * item.cantidad)}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-end mt-3 pt-3 border-t border-border">
                <span className="text-sm font-bold">Total: {formatARS(total)}</span>
              </div>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3 p-5 border-t border-border">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium border border-border hover:bg-secondary transition-colors">Cancelar</button>
          <button onClick={handleSubmit} disabled={isPending}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-foreground text-primary-foreground hover:bg-foreground/90 disabled:opacity-60 transition-colors">
            {isPending ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal: Clonar pedido ───────────────────────────────────────────────────

function ClonarPedidoModal({ pedido, negocioId, onClose }: { pedido: NegocioPedido; negocioId: string; onClose: () => void }) {
  const { toast } = useToast()
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [items, setItems] = useState(
    pedido.negocio_items.map((i) => ({
      id: i.id,
      nombre_producto: i.nombre_producto,
      precio_mayorista: Number(i.precio_mayorista),
      cantidad: i.cantidad,
    }))
  )
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function setItemField(idx: number, field: 'precio_mayorista' | 'cantidad', value: number) {
    setItems((prev) => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item))
  }

  function handleSubmit() {
    setError(null)
    startTransition(async () => {
      const res = await createNegocioPedido({
        negocio_id: negocioId,
        fecha,
        items: items.map((i) => ({ nombre_producto: i.nombre_producto, precio_mayorista: i.precio_mayorista, cantidad: i.cantidad })),
      })
      if (res?.error) { setError(res.error); return }
      toast('Pedido clonado ✓')
      onClose()
    })
  }

  const total = items.reduce((s, i) => s + i.precio_mayorista * i.cantidad, 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-card rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-semibold flex items-center gap-2">📋 Clonar pedido</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary"><X size={15} /></button>
        </div>
        <div className="p-5 space-y-4">
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div>
            <label className="text-xs font-medium mb-1 block">Fecha del nuevo pedido</label>
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)}
              className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Productos (editables)</p>
            <div className="grid grid-cols-12 gap-2 text-xs text-muted-foreground font-medium px-1 mb-1">
              <div className="col-span-5">Producto</div>
              <div className="col-span-3">Precio</div>
              <div className="col-span-2">Cant.</div>
              <div className="col-span-2 text-right">Subtotal</div>
            </div>
            {items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-center mb-2">
                <div className="col-span-5 text-sm font-medium truncate">{item.nombre_producto}</div>
                <div className="col-span-3">
                  <input type="number" min="0" value={item.precio_mayorista || ''}
                    onChange={(e) => setItemField(idx, 'precio_mayorista', Number(e.target.value))}
                    className="w-full border border-input rounded-lg px-2 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div className="col-span-2">
                  <input type="number" min="1" value={item.cantidad}
                    onChange={(e) => setItemField(idx, 'cantidad', Math.max(1, Number(e.target.value)))}
                    className="w-full border border-input rounded-lg px-2 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div className="col-span-2 text-right text-sm font-semibold">{formatARS(item.precio_mayorista * item.cantidad)}</div>
              </div>
            ))}
            <div className="flex justify-end pt-2 border-t border-border">
              <span className="text-sm font-bold">Total: {formatARS(total)}</span>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 p-5 border-t border-border">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium border border-border hover:bg-secondary transition-colors">Cancelar</button>
          <button onClick={handleSubmit} disabled={isPending}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-foreground text-primary-foreground hover:bg-foreground/90 disabled:opacity-60 transition-colors">
            {isPending ? 'Creando...' : 'Crear pedido'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Card de pedido ─────────────────────────────────────────────────────────

function PedidoCard({ pedido, negocioId }: { pedido: NegocioPedido; negocioId: string }) {
  const [expanded, setExpanded] = useState(!pedido.entregado_at)
  const [showEntrega, setShowEntrega] = useState(false)
  const [showAgregar, setShowAgregar] = useState(false)
  const [showEditar, setShowEditar] = useState(false)
  const [showClonar, setShowClonar] = useState(false)
  const [isPending, startTransition] = useTransition()
  const { confirm, ConfirmDialog } = useConfirm()
  const { toast } = useToast()
  const total = pedidoTotal(pedido)
  const entregado = !!pedido.entregado_at

  async function handleDelete() {
    const ok = await confirm('¿Eliminar este pedido?', { confirmLabel: 'Eliminar' })
    if (!ok) return
    startTransition(async () => {
      const res = await deleteNegocioPedido(pedido.id, negocioId)
      if (res?.error) toast(res.error, 'error')
    })
  }
  async function handleDeleteItem(itemId: string) {
    const ok = await confirm('¿Eliminar este producto del pedido?', { confirmLabel: 'Eliminar' })
    if (!ok) return
    startTransition(async () => { await deleteNegocioItem(itemId, negocioId) })
  }

  return (
    <>
      {ConfirmDialog}
      {showEntrega && <EntregaModal pedido={pedido} negocioId={negocioId} onClose={() => setShowEntrega(false)} />}
      {showAgregar && <AgregarItemsModal pedido={pedido} negocioId={negocioId} onClose={() => setShowAgregar(false)} />}
      {showEditar && <EditarPedidoModal pedido={pedido} negocioId={negocioId} onClose={() => setShowEditar(false)} />}
      {showClonar && <ClonarPedidoModal pedido={pedido} negocioId={negocioId} onClose={() => setShowClonar(false)} />}

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 flex-wrap">
          <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-2 flex-1 min-w-0 text-left">
            <span className="text-sm font-semibold">{formatFecha(pedido.fecha)}</span>
            {entregado ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                <Check size={10} /> Entregado {formatFecha(pedido.entregado_at!.split('T')[0])}
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200">Pendiente</span>
            )}
            {pedido.nota && <span className="text-xs text-muted-foreground italic truncate max-w-[140px]">{pedido.nota}</span>}
          </button>
          <div className="flex items-center gap-2 shrink-0">
            <span className="font-bold text-sm">{formatARS(total)}</span>
            {!entregado && (
              <button onClick={() => setShowEntrega(true)}
                className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors">
                <Check size={11} /> Entregar
              </button>
            )}
            <button onClick={() => setShowEditar(true)}
              className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-border hover:bg-secondary transition-colors">
              <Pencil size={11} /> Editar
            </button>
            <button onClick={() => setShowClonar(true)}
              className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-border hover:bg-secondary transition-colors">
              📋
            </button>
            <button onClick={() => setShowAgregar(true)}
              className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-border hover:bg-secondary transition-colors">
              <Plus size={11} /> Items
            </button>
            <button onClick={handleDelete} disabled={isPending}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50">
              <Trash2 size={14} />
            </button>
            <button onClick={() => setExpanded(!expanded)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
              {expanded ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
            </button>
          </div>
        </div>

        {expanded && (
          <div className="border-t border-border px-4 pb-3 pt-3">
            {pedido.negocio_items.length === 0 ? (
              <p className="text-sm text-muted-foreground py-1">Sin productos — usá "+ Items" para agregar.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground">
                    <th className="text-left pb-2 font-medium">Producto</th>
                    <th className="text-right pb-2 font-medium">Precio may.</th>
                    <th className="text-right pb-2 font-medium">Cant.</th>
                    <th className="text-right pb-2 font-medium">Subtotal</th>
                    <th className="w-6" />
                  </tr>
                </thead>
                <tbody>
                  {pedido.negocio_items.map((item) => (
                    <tr key={item.id} className="border-t border-border/50">
                      <td className="py-1.5 font-medium">{item.nombre_producto}</td>
                      <td className="py-1.5 text-right text-muted-foreground">{formatARS(item.precio_mayorista)}</td>
                      <td className="py-1.5 text-right text-muted-foreground">{item.cantidad}</td>
                      <td className="py-1.5 text-right font-semibold">{formatARS(Number(item.precio_mayorista) * item.cantidad)}</td>
                      <td className="py-1.5 pl-2">
                        <button onClick={() => handleDeleteItem(item.id)} disabled={isPending}
                          className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 size={11} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3} className="pt-2 text-xs text-muted-foreground text-right">Total</td>
                    <td className="pt-2 text-right font-bold">{formatARS(total)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        )}
      </div>
    </>
  )
}

// ── Vista principal ────────────────────────────────────────────────────────

export default function NegocioDetalleView({ negocio }: { negocio: Negocio }) {
  const pendientes = negocio.negocio_pedidos.filter((p) => !p.entregado_at)
  const entregados = negocio.negocio_pedidos.filter((p) => p.entregado_at)

  return (
    <div className="space-y-6">
      {/* Stock siempre arriba */}
      <StockSection negocio={negocio} />

      {/* Pedidos */}
      {negocio.negocio_pedidos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center bg-card border border-border rounded-xl">
          <p className="font-medium">Sin pedidos cargados</p>
          <p className="text-sm text-muted-foreground mt-1">Usá "Nuevo pedido" para registrar la primera entrega</p>
        </div>
      ) : (
        <div className="space-y-5">
          {pendientes.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">🟡 Pendientes de entrega ({pendientes.length})</h2>
              {pendientes.map((p) => <PedidoCard key={p.id} pedido={p} negocioId={negocio.id} />)}
            </section>
          )}
          {entregados.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">✅ Entregados ({entregados.length})</h2>
              {entregados.map((p) => <PedidoCard key={p.id} pedido={p} negocioId={negocio.id} />)}
            </section>
          )}
        </div>
      )}
    </div>
  )
}
