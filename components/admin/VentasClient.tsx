'use client'

import { useState, useTransition, useMemo, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import ConsignacionToggle from './ConsignacionToggle'
import { formatARS, formatDateTime, formatDate, ESTADO_LABELS, ESTADO_COLORS, ORIGEN_LABELS, METODO_PAGO_LABELS } from '@/lib/utils'
import { ChevronDown, ChevronUp, Search, X, SlidersHorizontal, FileText } from 'lucide-react'
import OrderActions from '@/components/admin/OrderActions'
import OrderSenaInput from '@/components/admin/OrderSenaInput'
import CopyButton from '@/components/admin/CopyButton'
import { updateOrderSena, updateOrderCostoEstimado } from '@/lib/actions/orders'
import OrderNotaInternaInput from './OrderNotaInternaInput'
import FechaEntregaInput from './FechaEntregaInput'
import EditOrderItemsButton from './EditOrderItemsButton'
import OrderEventLog from './OrderEventLog'
import OrderItemCheck from './OrderItemCheck'
import type { OrderEstado } from '@/lib/supabase/types'

interface Order {
  id: string
  numero?: number
  estado: OrderEstado
  origen: string
  metodo_pago?: string
  created_at: string
  fecha_entrega?: string | null
  prioridad?: boolean
  cliente_nombre: string
  cliente_telefono?: string
  entrega: string
  direccion_envio?: string
  nota?: string
  total: number
  sena?: number
  nota_interna?: string | null
  costo_estimado?: number | null
  es_consignacion?: boolean
  dias_devolucion?: number
  order_items?: {
    id: string
    products?: { nombre: string }
    nombre_producto: string
    product_variants?: { nombre_variante: string; stock: number }
    nombre_variante?: string
    cantidad: number
    precio_unitario: number
    impreso?: boolean
    cantidad_impresa?: number
  }[]
}

type Tab = 'activas' | 'entregadas' | 'local' | 'consignacion'

const GRUPO = {
  imprimiendo: {
    label: '🖨️ Imprimiendo',
    accent: 'text-cyan-700 dark:text-cyan-400',
    badge: 'bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300 dark:border-cyan-700',
    border: 'border-l-cyan-500',
  },
  listo: {
    label: '📦 Listo para entregar',
    accent: 'text-purple-700 dark:text-purple-400',
    badge: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700',
    border: 'border-l-purple-500',
  },
  confirmada: {
    label: '✅ Confirmadas',
    accent: 'text-blue-700 dark:text-blue-400',
    badge: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700',
    border: 'border-l-blue-400',
  },
  pendiente: {
    label: '⏳ Pendientes de confirmar',
    accent: 'text-yellow-700 dark:text-yellow-400',
    badge: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700',
    border: 'border-l-yellow-400',
  },
}

export default function VentasClient({
  activas,
  entregadas,
  local,
  consignaciones = [],
}: {
  activas: Order[]
  entregadas: Order[]
  local: Order[]
  consignaciones?: Order[]
}) {
  const [tab, setTab] = useState<Tab>('activas')
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [filterMetodo, setFilterMetodo] = useState('')
  const [filterDesde, setFilterDesde] = useState('')
  const [filterHasta, setFilterHasta] = useState('')
  const [soloDeuda, setSoloDeuda] = useState(false)
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set())

  // Al cambiar de tab, auto-expandir el mes más reciente
  const mostRecentMes = useMemo(() => {
    const src = tab === 'entregadas' ? entregadas : tab === 'local' ? local : []
    if (!src.length) return null
    return src.reduce((max, o) => (o.created_at > max ? o.created_at : max), '').slice(0, 7)
  }, [tab, entregadas, local])

  useEffect(() => {
    setExpandedMonths(mostRecentMes ? new Set([mostRecentMes]) : new Set())
  }, [tab, mostRecentMes])

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleMonth(mes: string) {
    setExpandedMonths((prev) => {
      const next = new Set(prev)
      next.has(mes) ? next.delete(mes) : next.add(mes)
      return next
    })
  }

  const totalDeuda = useMemo(
    () => entregadas.reduce((sum, o) => sum + Math.max(0, o.total - (o.sena ?? 0)), 0),
    [entregadas]
  )
  const deudoresCount = useMemo(
    () => entregadas.filter((o) => o.total - (o.sena ?? 0) > 0).length,
    [entregadas]
  )
  const pendienteActivas = useMemo(
    () => activas.reduce((sum, o) => sum + Math.max(0, o.total - (o.sena ?? 0)), 0),
    [activas]
  )
  const pendienteActivasCount = useMemo(
    () => activas.filter((o) => o.total - (o.sena ?? 0) > 0).length,
    [activas]
  )

  const baseOrders = useMemo(() => {
    const raw = tab === 'activas' ? activas : tab === 'entregadas' ? entregadas : local
    if ((tab === 'entregadas' || tab === 'local') && soloDeuda) {
      return raw.filter((o) => o.total - (o.sena ?? 0) > 0)
    }
    return raw
  }, [tab, activas, entregadas, local, soloDeuda])

  const orders = useMemo(() => {
    let result = baseOrders
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (o) =>
          o.cliente_nombre.toLowerCase().includes(q) ||
          o.cliente_telefono?.toLowerCase().includes(q) ||
          o.nota?.toLowerCase().includes(q)
      )
    }
    if (filterMetodo) result = result.filter((o) => o.metodo_pago === filterMetodo)
    if (filterDesde) result = result.filter((o) => o.created_at >= filterDesde)
    if (filterHasta) result = result.filter((o) => o.created_at <= filterHasta + 'T23:59:59')
    return result
  }, [baseOrders, search, filterMetodo, filterDesde, filterHasta])

  const hasActiveFilters = filterMetodo || filterDesde || filterHasta
  const total = useMemo(() => orders.reduce((sum, o) => sum + Number(o.total), 0), [orders])

  // Grupos por mes para entregadas / local
  const meses = useMemo(() => {
    if (tab === 'activas') return []
    const map = new Map<string, Order[]>()
    for (const o of orders) {
      const key = o.created_at.slice(0, 7)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(o)
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([mes, items]) => ({
        mes,
        label: formatMes(mes),
        items,
        isOpen: expandedMonths.has(mes),
        deuda: items.reduce((s, o) => s + Math.max(0, o.total - (o.sena ?? 0)), 0),
        total: items.reduce((s, o) => s + Number(o.total), 0),
      }))
  }, [tab, orders, expandedMonths])

  // Grupos para la tab activas
  function byFechaEntrega(a: Order, b: Order) {
    if (!a.fecha_entrega && !b.fecha_entrega) return 0
    if (!a.fecha_entrega) return 1
    if (!b.fecha_entrega) return -1
    return a.fecha_entrega.localeCompare(b.fecha_entrega)
  }

  const grupos = useMemo(() => ({
    imprimiendo: orders.filter((o) => o.estado === 'imprimiendo').sort(byFechaEntrega),
    listo: orders.filter((o) => o.estado === 'listo').sort(byFechaEntrega),
    confirmada: orders.filter((o) => o.estado === 'confirmada').sort(byFechaEntrega),
    pendiente: orders.filter((o) => o.estado === 'pendiente').sort(byFechaEntrega),
  }), [orders])

  const hayActivas = tab === 'activas' && (
    grupos.imprimiendo.length + grupos.listo.length + grupos.confirmada.length + grupos.pendiente.length > 0
  )

  return (
    <div className="space-y-5">
      {/* Tabs + controles */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setTab('activas')}
          className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
            tab === 'activas'
              ? 'bg-foreground text-primary-foreground border-foreground'
              : 'border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground'
          }`}
        >
          📋 En proceso
          {activas.length > 0 && (
            <span className={`ml-2 text-xs font-bold ${tab === 'activas' ? 'opacity-70' : 'text-muted-foreground'}`}>
              {activas.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setTab('entregadas')}
          className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
            tab === 'entregadas'
              ? 'bg-foreground text-primary-foreground border-foreground'
              : 'border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground'
          }`}
        >
          ✅ Entregadas
          {entregadas.length > 0 && (
            <span className={`ml-2 text-xs font-bold ${tab === 'entregadas' ? 'opacity-70' : 'text-muted-foreground'}`}>
              {entregadas.length}
            </span>
          )}
          {totalDeuda > 0 && tab !== 'entregadas' && (
            <span className="ml-1.5 text-xs font-semibold text-orange-600 hidden sm:inline">· Deben {formatARS(totalDeuda)}</span>
          )}
        </button>

        <button
          onClick={() => setTab('local')}
          className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
            tab === 'local'
              ? 'bg-foreground text-primary-foreground border-foreground'
              : 'border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground'
          }`}
        >
          🏪 Local
          {local.length > 0 && (
            <span className={`ml-2 text-xs font-bold ${tab === 'local' ? 'opacity-70' : 'text-muted-foreground'}`}>
              {local.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setTab('consignacion')}
          className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
            tab === 'consignacion'
              ? 'bg-amber-500 text-white border-amber-500'
              : 'border-border text-muted-foreground hover:border-amber-400 hover:text-amber-600'
          }`}
        >
          📦 Consignación
          {consignaciones.length > 0 && (
            <span className={`ml-2 text-xs font-bold ${tab === 'consignacion' ? 'opacity-80' : 'text-amber-600'}`}>
              {consignaciones.length}
            </span>
          )}
        </button>

        {/* Filtro solo deudores (visible en entregadas/local) */}
        {(tab === 'entregadas' || tab === 'local') && (
          <button
            onClick={() => setSoloDeuda((v) => !v)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              soloDeuda
                ? 'bg-orange-500 text-white border-orange-500'
                : 'border-border text-muted-foreground hover:border-orange-400 hover:text-orange-600'
            }`}
          >
            💰 Solo deudores
            {tab === 'entregadas' && deudoresCount > 0 && (
              <span className={`ml-1.5 font-bold ${soloDeuda ? 'opacity-80' : 'text-orange-600'}`}>
                {deudoresCount}
              </span>
            )}
          </button>
        )}

        {/* Búsqueda + filtros */}
        <div className="flex items-center gap-2 w-full sm:w-auto sm:ml-auto">
          {total > 0 && (
            <span className="text-sm font-semibold text-muted-foreground mr-auto sm:mr-0">{formatARS(total)}</span>
          )}
          <div className="relative flex-1 sm:flex-none">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar cliente..."
              className="pl-7 pr-7 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring w-full sm:w-44"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X size={11} />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border transition-colors shrink-0 ${showFilters || hasActiveFilters ? 'bg-foreground text-primary-foreground border-foreground' : 'border-border text-muted-foreground hover:text-foreground'}`}
          >
            <SlidersHorizontal size={12} />
            <span className="hidden sm:inline">Filtros{hasActiveFilters ? ' ●' : ''}</span>
            {hasActiveFilters && <span className="sm:hidden">●</span>}
          </button>
        </div>
      </div>

      {/* Banner cobro pendiente en activas */}
      {tab === 'activas' && pendienteActivas > 0 && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-xl text-sm">
          <span className="text-orange-600 dark:text-orange-400">💰</span>
          <span className="text-orange-700 dark:text-orange-300 font-medium">
            {pendienteActivasCount} pedido{pendienteActivasCount !== 1 ? 's' : ''} con cobro pendiente
          </span>
          <span className="text-orange-600 dark:text-orange-400 font-bold ml-auto">{formatARS(pendienteActivas)}</span>
        </div>
      )}

      {/* Panel filtros */}
      {showFilters && (
        <div className="flex items-end gap-3 flex-wrap p-3 bg-secondary/30 rounded-xl border border-border">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Método de pago</label>
            <select
              value={filterMetodo}
              onChange={(e) => setFilterMetodo(e.target.value)}
              className="text-xs border border-border rounded-lg px-2 py-1.5 bg-background"
            >
              <option value="">Todos</option>
              {Object.entries(METODO_PAGO_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Desde</label>
            <input type="date" value={filterDesde} onChange={(e) => setFilterDesde(e.target.value)}
              className="text-xs border border-border rounded-lg px-2 py-1.5 bg-background" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Hasta</label>
            <input type="date" value={filterHasta} onChange={(e) => setFilterHasta(e.target.value)}
              className="text-xs border border-border rounded-lg px-2 py-1.5 bg-background" />
          </div>
          {hasActiveFilters && (
            <button
              onClick={() => { setFilterMetodo(''); setFilterDesde(''); setFilterHasta('') }}
              className="text-xs text-muted-foreground hover:text-foreground underline pb-1.5"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      )}

      {/* ── TAB: EN PROCESO (agrupado por estado) ── */}
      {tab === 'activas' && (
        hayActivas ? (
          <div className="space-y-7">
            {/* Imprimiendo — siempre expandido con checkboxes */}
            {grupos.imprimiendo.length > 0 && (
              <section>
                <GrupoHeader cfg={GRUPO.imprimiendo} count={grupos.imprimiendo.length} />
                <div className="space-y-3">
                  {grupos.imprimiendo.map((o) => <FullCard key={o.id} order={o} />)}
                </div>
              </section>
            )}

            {/* Listo para entregar */}
            {grupos.listo.length > 0 && (
              <section>
                <GrupoHeader cfg={GRUPO.listo} count={grupos.listo.length} />
                <div className="space-y-2">
                  {grupos.listo.map((o) => (
                    <ActiveCard
                      key={o.id}
                      order={o}
                      expanded={expandedIds.has(o.id)}
                      onToggle={() => toggleExpanded(o.id)}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Confirmadas */}
            {grupos.confirmada.length > 0 && (
              <section>
                <GrupoHeader cfg={GRUPO.confirmada} count={grupos.confirmada.length} />
                <div className="space-y-2">
                  {grupos.confirmada.map((o) => (
                    <ActiveCard
                      key={o.id}
                      order={o}
                      expanded={expandedIds.has(o.id)}
                      onToggle={() => toggleExpanded(o.id)}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Pendientes de confirmar */}
            {grupos.pendiente.length > 0 && (
              <section>
                <GrupoHeader cfg={GRUPO.pendiente} count={grupos.pendiente.length} />
                <div className="space-y-2">
                  {grupos.pendiente.map((o) => (
                    <ActiveCard
                      key={o.id}
                      order={o}
                      expanded={expandedIds.has(o.id)}
                      onToggle={() => toggleExpanded(o.id)}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        ) : (
          <EmptyState search={search} onClear={() => setSearch('')} message="No hay pedidos en proceso" />
        )
      )}

      {/* ── TAB: ENTREGADAS / LOCAL (agrupado por mes) ── */}
      {tab === 'consignacion' && (
        <ConsignacionView orders={consignaciones} />
      )}

      {(tab === 'entregadas' || tab === 'local') && (
        meses.length === 0 ? (
          <EmptyState search={search} onClear={() => setSearch('')} message={soloDeuda ? 'Nadie debe plata 🎉' : tab === 'entregadas' ? 'No hay ventas entregadas' : 'No hay ventas en el local'} />
        ) : (
          <div className="space-y-3">
            {meses.map(({ mes, label, items, isOpen, deuda, total: mesTotal }) => (
              <div key={mes} className="bg-card border border-border rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleMonth(mes)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-secondary/30 transition-colors text-left"
                >
                  <div className="flex items-center gap-3 flex-wrap min-w-0">
                    <span className="font-semibold text-sm capitalize">{label}</span>
                    <span className="text-xs text-muted-foreground bg-secondary rounded-full px-2 py-0.5">
                      {items.length} pedido{items.length !== 1 ? 's' : ''}
                    </span>
                    <span className="text-xs font-medium text-muted-foreground">{formatARS(mesTotal)}</span>
                    {deuda > 0 && (
                      <span className="text-xs font-semibold text-orange-600 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-full px-2 py-0.5">
                        Deben {formatARS(deuda)}
                      </span>
                    )}
                  </div>
                  {isOpen ? <ChevronUp size={14} className="text-muted-foreground shrink-0" /> : <ChevronDown size={14} className="text-muted-foreground shrink-0" />}
                </button>
                {isOpen && (
                  <div className="border-t border-border divide-y divide-border/50">
                    {items.map((order) => (
                      <CollapsibleCard
                        key={order.id}
                        order={order}
                        expanded={expandedIds.has(order.id)}
                        onToggle={() => toggleExpanded(order.id)}
                        flat
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}
    </div>
  )
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatMes(mes: string): string {
  const [y, m] = mes.split('-')
  return new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric' }).format(new Date(Number(y), Number(m) - 1, 1))
}

function EmptyState({ search, onClear, message }: { search: string; onClear: () => void; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center bg-card border border-border rounded-xl">
      <p className="font-medium">{search ? 'Sin resultados' : message}</p>
      {search && (
        <>
          <p className="text-sm text-muted-foreground mt-1">No se encontró &ldquo;{search}&rdquo;</p>
          <button onClick={onClear} className="mt-3 text-xs text-muted-foreground hover:text-foreground underline">
            Limpiar búsqueda
          </button>
        </>
      )}
    </div>
  )
}

function GrupoHeader({ cfg, count }: { cfg: typeof GRUPO[keyof typeof GRUPO]; count: number }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <h2 className={`text-sm font-semibold ${cfg.accent}`}>{cfg.label}</h2>
      <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${cfg.badge}`}>{count}</span>
    </div>
  )
}

// ── Helper: cobro rápido inline ────────────────────────────────────────────────

function CobrarInline({ orderId, total, sena }: { orderId: string; total: number; sena: number }) {
  const pendiente = total - sena
  const [showInput, setShowInput] = useState(false)
  const [valor, setValor] = useState(pendiente)
  const [isPending, startTransition] = useTransition()

  if (pendiente <= 0) return <span className="text-xs font-medium text-green-600">✓ Pagado</span>

  function confirmar() {
    const nuevoSena = Math.min(total, sena + valor)
    startTransition(async () => {
      await updateOrderSena(orderId, nuevoSena)
      setShowInput(false)
    })
  }

  if (!showInput) return (
    <button
      onClick={() => { setValor(pendiente); setShowInput(true) }}
      className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-colors"
    >
      💰 Cobrar {formatARS(pendiente)}
    </button>
  )

  return (
    <div className="flex items-center gap-1.5">
      <input
        type="number" min="1" max={pendiente} value={valor || ''}
        onChange={(e) => setValor(Number(e.target.value))}
        className="w-24 text-xs border border-orange-400 rounded-lg px-2 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-orange-500"
        autoFocus
        onKeyDown={(e) => { if (e.key === 'Enter') confirmar(); if (e.key === 'Escape') setShowInput(false) }}
      />
      <button onClick={confirmar} disabled={isPending || valor <= 0}
        className="text-xs font-semibold text-white bg-green-600 hover:bg-green-700 px-2 py-1.5 rounded-lg disabled:opacity-50 transition-colors">
        {isPending ? '...' : 'OK'}
      </button>
      <button onClick={() => setShowInput(false)} className="text-xs text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-secondary transition-colors">✕</button>
    </div>
  )
}

// ── Helper: badge fecha de entrega ─────────────────────────────────────────────

function FechaEntregaBadge({ fecha }: { fecha: string }) {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
  const d = new Date(fecha + 'T12:00:00')
  const diff = Math.floor((d.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
  const label = diff < 0 ? `⚠ Venció hace ${-diff}d` : diff === 0 ? '⚡ Hoy' : diff === 1 ? '📅 Mañana' : `📅 ${formatDate(fecha)}`
  const cls = diff < 0
    ? 'bg-red-100 text-red-700 border-red-300 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800'
    : diff === 0
      ? 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-800'
      : diff <= 2
        ? 'bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-950/40 dark:text-yellow-400 dark:border-yellow-800'
        : 'bg-secondary text-muted-foreground border-border'
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border shrink-0 ${cls}`}>{label}</span>
}

// ── Card: Imprimiendo (expandida con checkboxes) ───────────────────────────────

function GenerarPresupuestoBtn({ order }: { order: Order }) {
  const router = useRouter()
  const handleClick = useCallback(() => {
    const payload = {
      cliente: {
        nombre: order.cliente_nombre,
        telefono: order.cliente_telefono ?? '',
      },
      items: (order.order_items ?? []).map((i) => ({
        descripcion: i.nombre_variante ? `${i.nombre_producto} — ${i.nombre_variante}` : i.nombre_producto,
        unidades: i.cantidad,
        precio: i.precio_unitario,
      })),
    }
    localStorage.setItem('presupuesto_importar_pedido', JSON.stringify(payload))
    router.push('/admin/presupuesto')
  }, [order, router])

  return (
    <button
      onClick={handleClick}
      title="Generar presupuesto desde este pedido"
      className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium border border-border rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
    >
      <FileText size={12} />
      Presupuesto
    </button>
  )
}

function FullCard({ order }: { order: Order }) {
  const items = order.order_items ?? []
  const impresos = items.filter((i) => i.impreso).length
  const todosImpresos = items.length > 0 && impresos === items.length

  return (
    <div className={`bg-card border rounded-xl p-4 shadow-sm space-y-3 border-l-4 ${todosImpresos ? 'border-l-green-500 border-green-200 dark:border-green-800' : 'border-l-cyan-500 border-border'}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${ESTADO_COLORS[order.estado]}`}>
            {ESTADO_LABELS[order.estado]}
          </span>
          {order.fecha_entrega && <FechaEntregaBadge fecha={order.fecha_entrega} />}
          <span className="text-xs text-muted-foreground">{ORIGEN_LABELS[order.origen] ?? order.origen}</span>
          {order.metodo_pago && (
            <span className="text-xs text-muted-foreground">{METODO_PAGO_LABELS[order.metodo_pago] ?? order.metodo_pago}</span>
          )}
        </div>
        <span className="text-xs text-muted-foreground shrink-0">{formatDateTime(order.created_at)}</span>
      </div>

      {/* Progreso impresión */}
      {items.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className={`font-semibold ${todosImpresos ? 'text-green-600 dark:text-green-400' : 'text-cyan-700 dark:text-cyan-400'}`}>
              {todosImpresos ? '✓ Todo impreso — listo para mover' : `🖨️ ${impresos} de ${items.length} impresos`}
            </span>
            <span className="text-muted-foreground">{Math.round((impresos / items.length) * 100)}%</span>
          </div>
          <div className="w-full bg-secondary rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full transition-all ${todosImpresos ? 'bg-green-500' : 'bg-cyan-500'}`}
              style={{ width: `${(impresos / items.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Cliente */}
      <div className="flex items-start gap-6 flex-wrap">
        <div>
          <span className="text-xs text-muted-foreground block">Cliente</span>
          <span className="font-semibold text-sm">{order.cliente_nombre}</span>
        </div>
        {order.cliente_telefono && (
          <div>
            <span className="text-xs text-muted-foreground block">Teléfono</span>
            <div className="flex items-center gap-1">
              <a href={`tel:${order.cliente_telefono}`} className="text-sm font-medium hover:underline">
                {order.cliente_telefono}
              </a>
              <CopyButton text={order.cliente_telefono} />
            </div>
          </div>
        )}
        {order.entrega === 'envio' && order.direccion_envio && (
          <div>
            <span className="text-xs text-muted-foreground block">Dirección</span>
            <span className="text-sm">📦 {order.direccion_envio}</span>
          </div>
        )}
      </div>

      {/* Productos con checkboxes */}
      <div className="border-t border-border pt-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Productos</span>
          <EditOrderItemsButton
            orderId={order.id}
            items={(order.order_items ?? []).map((i) => ({
              nombre_producto: i.products?.nombre ?? i.nombre_producto,
              nombre_variante: i.product_variants?.nombre_variante ?? i.nombre_variante ?? null,
              cantidad: i.cantidad,
              precio_unitario: i.precio_unitario,
            }))}
          />
        </div>
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className={`flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg ${item.impreso ? 'bg-green-50 dark:bg-green-900/10' : 'bg-secondary/30'}`}>
              <div className="min-w-0 flex-1 text-sm">
                <span className={`font-medium ${item.impreso ? 'line-through text-muted-foreground' : ''}`}>
                  {item.products?.nombre ?? item.nombre_producto}
                </span>
                {(item.product_variants?.nombre_variante || item.nombre_variante) && (
                  <span className="text-muted-foreground"> — {item.product_variants?.nombre_variante ?? item.nombre_variante}</span>
                )}
                <span className="text-muted-foreground"> × {item.cantidad}</span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <OrderItemCheck itemId={item.id} impreso={item.impreso ?? false} cantidad={item.cantidad} cantidadImpresa={item.cantidad_impresa ?? 0} />
                <span className="text-sm font-semibold">{formatARS(item.precio_unitario * item.cantidad)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {order.nota && <p className="text-xs text-muted-foreground italic">📝 {order.nota}</p>}

      <FechaEntregaInput orderId={order.id} fechaEntrega={order.fecha_entrega ?? null} />

      {/* Total + Seña + Acciones */}
      <div className="border-t border-border pt-3 flex items-end justify-between gap-3 flex-wrap">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Total:</span>
              <span className="text-base font-bold">{formatARS(order.total)}</span>
            </div>
            {(order.sena ?? 0) > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span>Seña: <span className="font-medium text-foreground">{formatARS(order.sena ?? 0)}</span></span>
                {order.total - (order.sena ?? 0) > 0 && (
                  <span className="font-semibold text-orange-600 dark:text-orange-400">
                    · Pendiente: {formatARS(order.total - (order.sena ?? 0))}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <CobrarInline orderId={order.id} total={order.total} sena={order.sena ?? 0} />
          </div>
          <OrderNotaInternaInput orderId={order.id} notaInterna={order.nota_interna ?? null} />
          <CostoEstimadoInput orderId={order.id} total={order.total} costoEstimado={order.costo_estimado ?? null} />
          <ConsignacionToggle orderId={order.id} esConsignacion={order.es_consignacion ?? false} diasDevolucion={order.dias_devolucion ?? 15} />
        </div>
        <div className="flex flex-col items-end gap-2">
          <OrderActions orderId={order.id} estado={order.estado} />
          <GenerarPresupuestoBtn order={order} />
        </div>
      </div>
      <OrderEventLog orderId={order.id} />
    </div>
  )
}

// ── Card: Listo / Confirmada / Pendiente (compacta, expandible) ───────────────

function ActiveCard({
  order,
  expanded,
  onToggle,
}: {
  order: Order
  expanded: boolean
  onToggle: () => void
}) {
  const borderByEstado: Record<string, string> = {
    listo: 'border-l-purple-500',
    confirmada: 'border-l-blue-400',
    pendiente: 'border-l-yellow-400',
  }
  const border = borderByEstado[order.estado] ?? 'border-l-border'
  const items = order.order_items ?? []

  return (
    <div className={`bg-card border border-border rounded-xl overflow-hidden shadow-sm border-l-4 ${border}`}>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/30 transition-colors text-left"
      >
        <div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border shrink-0 ${ESTADO_COLORS[order.estado]}`}>
            {ESTADO_LABELS[order.estado]}
          </span>
          {order.fecha_entrega && <FechaEntregaBadge fecha={order.fecha_entrega} />}
          <span className="font-semibold text-sm truncate">{order.cliente_nombre}</span>
          {order.nota && (
            <span className="text-xs text-muted-foreground italic truncate hidden sm:block">— {order.nota}</span>
          )}
          {(() => {
            const pend = order.total - (order.sena ?? 0)
            if (pend > 0) return (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700 border border-orange-300 shrink-0 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-800">
                Debe {formatARS(pend)}
              </span>
            )
            if (order.total > 0) return <span className="text-xs font-medium text-green-600 shrink-0">✓ Pagado</span>
            return null
          })()}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {items.length > 0 && (
            <span className="text-xs text-muted-foreground hidden sm:block">{items.length} item{items.length !== 1 ? 's' : ''}</span>
          )}
          <span className="font-bold text-sm">{formatARS(order.total)}</span>
          {expanded ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
          {/* Productos */}
          {items.length > 0 && (
            <div className="space-y-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Productos</span>
                <EditOrderItemsButton
                  orderId={order.id}
                  items={items.map((i) => ({
                    nombre_producto: i.products?.nombre ?? i.nombre_producto,
                    nombre_variante: i.product_variants?.nombre_variante ?? i.nombre_variante ?? null,
                    cantidad: i.cantidad,
                    precio_unitario: i.precio_unitario,
                  }))}
                />
              </div>
              {items.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="min-w-0">
                    <span className="font-medium">{item.products?.nombre ?? item.nombre_producto}</span>
                    {(item.product_variants?.nombre_variante || item.nombre_variante) && (
                      <span className="text-muted-foreground"> — {item.product_variants?.nombre_variante ?? item.nombre_variante}</span>
                    )}
                    <span className="text-muted-foreground"> × {item.cantidad}</span>
                  </span>
                  <span className="shrink-0 font-semibold">{formatARS(item.precio_unitario * item.cantidad)}</span>
                </div>
              ))}
            </div>
          )}

          {order.nota && <p className="text-xs text-muted-foreground italic">📝 {order.nota}</p>}

          {order.cliente_telefono && (
            <div className="flex items-center gap-1">
              <a href={`tel:${order.cliente_telefono}`} className="text-sm text-muted-foreground hover:underline">
                {order.cliente_telefono}
              </a>
              <CopyButton text={order.cliente_telefono} />
            </div>
          )}

          {order.entrega === 'envio' && order.direccion_envio && (
            <p className="text-xs text-muted-foreground">📦 {order.direccion_envio}</p>
          )}

          <FechaEntregaInput orderId={order.id} fechaEntrega={order.fecha_entrega ?? null} />

          <div className="border-t border-border pt-3 flex items-end justify-between gap-3 flex-wrap">
            <div className="space-y-1.5">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Total:</span>
                  <span className="font-bold">{formatARS(order.total)}</span>
                </div>
                {(order.sena ?? 0) > 0 && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span>Seña: <span className="font-medium text-foreground">{formatARS(order.sena ?? 0)}</span></span>
                    {order.total - (order.sena ?? 0) > 0 && (
                      <span className="font-semibold text-orange-600 dark:text-orange-400">
                        · Pendiente: {formatARS(order.total - (order.sena ?? 0))}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <CobrarInline orderId={order.id} total={order.total} sena={order.sena ?? 0} />
              <OrderNotaInternaInput orderId={order.id} notaInterna={order.nota_interna ?? null} />
              <CostoEstimadoInput orderId={order.id} total={order.total} costoEstimado={order.costo_estimado ?? null} />
              <ConsignacionToggle orderId={order.id} esConsignacion={order.es_consignacion ?? false} diasDevolucion={order.dias_devolucion ?? 15} />
            </div>
            <div className="flex flex-col items-end gap-2">
              <OrderActions orderId={order.id} estado={order.estado} />
              <GenerarPresupuestoBtn order={order} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Card: Entregadas / Local (compacta con cobro inline) ──────────────────────

function CollapsibleCard({
  order,
  expanded,
  onToggle,
  flat = false,
}: {
  order: Order
  expanded: boolean
  onToggle: () => void
  flat?: boolean
}) {
  const pendiente = order.total - (order.sena ?? 0)
  const pagado = (order.sena ?? 0) >= order.total && order.total > 0
  const tienePendiente = !pagado && pendiente > 0

  const [showCobrar, setShowCobrar] = useState(false)
  const [valorCobro, setValorCobro] = useState(pendiente)
  const [isPending, startTransition] = useTransition()

  function abrirCobrar(e: React.MouseEvent) {
    e.stopPropagation()
    setValorCobro(pendiente)
    setShowCobrar(true)
  }

  function confirmarCobro(e: React.MouseEvent) {
    e.stopPropagation()
    const nuevoSena = Math.min(order.total, (order.sena ?? 0) + valorCobro)
    startTransition(async () => {
      await updateOrderSena(order.id, nuevoSena)
      setShowCobrar(false)
    })
  }

  function cancelarCobro(e: React.MouseEvent) {
    e.stopPropagation()
    setShowCobrar(false)
  }

  return (
    <div className={`bg-card overflow-hidden border-l-4 ${flat ? '' : 'rounded-xl shadow-sm'} ${tienePendiente ? 'border-l-orange-500' + (flat ? '' : ' border-t border-r border-b border-orange-500/40') : 'border-l-transparent' + (flat ? '' : ' border border-border')}`}>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-secondary/30 transition-colors text-left"
      >
        <div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap">
          {order.numero && (
            <span className="text-xs font-mono text-muted-foreground shrink-0">#{order.numero}</span>
          )}
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border shrink-0 ${ESTADO_COLORS[order.estado]}`}>
            {ESTADO_LABELS[order.estado]}
          </span>
          <span className="font-semibold text-sm truncate">{order.cliente_nombre}</span>
          {pagado && <span className="text-xs font-medium text-green-600 shrink-0">✓ Pagado</span>}
          {tienePendiente && !showCobrar && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700 border border-orange-300 shrink-0 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-800">
              Debe {formatARS(pendiente)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
          {tienePendiente && !showCobrar && (
            <button onClick={abrirCobrar} className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-colors">
              💰 Cobrar
            </button>
          )}
          {tienePendiente && showCobrar && (
            <div className="flex items-center gap-1.5">
              <input
                type="number" min="1" max={pendiente} value={valorCobro || ''}
                onChange={(e) => setValorCobro(Number(e.target.value))}
                className="w-24 text-xs border border-orange-400 rounded-lg px-2 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-orange-500"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') confirmarCobro(e as any)
                  if (e.key === 'Escape') cancelarCobro(e as any)
                }}
              />
              <button onClick={confirmarCobro} disabled={isPending || valorCobro <= 0}
                className="text-xs font-semibold text-white bg-green-600 hover:bg-green-700 px-2 py-1.5 rounded-lg disabled:opacity-50 transition-colors">
                {isPending ? '...' : 'OK'}
              </button>
              <button onClick={cancelarCobro} className="text-xs text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-secondary transition-colors">✕</button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="font-bold text-sm">{formatARS(order.total)}</span>
          <span className="text-xs text-muted-foreground hidden sm:block">{formatDateTime(order.created_at)}</span>
          {expanded ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Productos</span>
              <EditOrderItemsButton
                orderId={order.id}
                items={(order.order_items ?? []).map((i) => ({
                  nombre_producto: i.products?.nombre ?? i.nombre_producto,
                  nombre_variante: i.product_variants?.nombre_variante ?? i.nombre_variante ?? null,
                  cantidad: i.cantidad,
                  precio_unitario: i.precio_unitario,
                }))}
              />
            </div>
            {order.order_items?.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1 text-sm">
                  <span className="font-medium">{item.products?.nombre ?? item.nombre_producto}</span>
                  {(item.product_variants?.nombre_variante || item.nombre_variante) && (
                    <span className="text-muted-foreground"> — {item.product_variants?.nombre_variante ?? item.nombre_variante}</span>
                  )}
                  <span className="text-muted-foreground"> × {item.cantidad}</span>
                </div>
                <span className="text-sm font-semibold shrink-0">{formatARS(item.precio_unitario * item.cantidad)}</span>
              </div>
            ))}
          </div>

          {order.nota && <p className="text-xs text-muted-foreground italic">📝 {order.nota}</p>}

          <div className="border-t border-border pt-3 flex items-end justify-between gap-3 flex-wrap">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Total:</span>
                <span className="text-base font-bold">{formatARS(order.total)}</span>
              </div>
              <OrderSenaInput orderId={order.id} sena={order.sena ?? 0} total={order.total} />
              <OrderNotaInternaInput orderId={order.id} notaInterna={order.nota_interna ?? null} />
              <CostoEstimadoInput orderId={order.id} total={order.total} costoEstimado={order.costo_estimado ?? null} />
            </div>
            {order.cliente_telefono && (
              <div className="flex items-center gap-1">
                <a href={`tel:${order.cliente_telefono}`} className="text-sm font-medium hover:underline text-muted-foreground">
                  {order.cliente_telefono}
                </a>
                <CopyButton text={order.cliente_telefono} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Vista de consignaciones activas ───────────────────────────────────────────

function ConsignacionView({ orders }: { orders: Order[] }) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  if (orders.length === 0) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-10 text-center dark:bg-amber-950/20 dark:border-amber-800">
        <p className="text-3xl mb-2">📦</p>
        <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Sin consignaciones activas</p>
        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Marcá un pedido como consignación desde su tarjeta</p>
      </div>
    )
  }

  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)

  function vencimiento(order: Order): { fecha: Date | null; dias: number | null; label: string; color: string } {
    if (!order.fecha_entrega) return { fecha: null, dias: null, label: 'Sin fecha de entrega', color: 'text-muted-foreground' }
    const entrega = new Date(order.fecha_entrega + 'T00:00:00')
    const vence = new Date(entrega)
    vence.setDate(vence.getDate() + (order.dias_devolucion ?? 15))
    const diff = Math.ceil((vence.getTime() - hoy.getTime()) / 86400000)
    if (diff < 0) return { fecha: vence, dias: diff, label: `Venció hace ${Math.abs(diff)} día${Math.abs(diff) !== 1 ? 's' : ''}`, color: 'text-red-600' }
    if (diff === 0) return { fecha: vence, dias: 0, label: 'Vence hoy', color: 'text-red-600' }
    if (diff <= 3) return { fecha: vence, dias: diff, label: `Vence en ${diff} día${diff !== 1 ? 's' : ''}`, color: 'text-orange-600' }
    if (diff <= 7) return { fecha: vence, dias: diff, label: `Vence en ${diff} días`, color: 'text-yellow-600' }
    return { fecha: vence, dias: diff, label: `${diff} días restantes`, color: 'text-green-600' }
  }

  const totalValor = orders.reduce((s, o) => s + Number(o.total), 0)
  const vencidos = orders.filter((o) => { const v = vencimiento(o); return v.dias !== null && v.dias < 0 }).length

  return (
    <div className="space-y-4">
      {/* Resumen */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 dark:bg-amber-950/20 dark:border-amber-800">
          <p className="text-xs text-muted-foreground">En consignación</p>
          <p className="text-xl font-bold text-amber-700 dark:text-amber-300 mt-0.5">{orders.length}</p>
          <p className="text-xs text-muted-foreground">pedidos</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Valor total</p>
          <p className="text-xl font-bold mt-0.5">{formatARS(totalValor)}</p>
          <p className="text-xs text-muted-foreground">en la calle</p>
        </div>
        <div className={`border rounded-xl p-4 ${vencidos > 0 ? 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800' : 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800'}`}>
          <p className="text-xs text-muted-foreground">Vencidos</p>
          <p className={`text-xl font-bold mt-0.5 ${vencidos > 0 ? 'text-red-600' : 'text-green-600'}`}>{vencidos}</p>
          <p className="text-xs text-muted-foreground">sin resolver</p>
        </div>
      </div>

      {/* Lista */}
      <div className="space-y-2">
        {orders.map((order) => {
          const v = vencimiento(order)
          const expanded = expandedIds.has(order.id)
          const pendiente = Math.max(0, Number(order.total) - Number(order.sena ?? 0))

          return (
            <div key={order.id} className={`bg-card border rounded-xl overflow-hidden shadow-sm border-l-4 ${v.dias !== null && v.dias < 0 ? 'border-l-red-500 border-red-200 dark:border-red-800' : v.dias !== null && v.dias <= 3 ? 'border-l-orange-400 border-border' : 'border-l-amber-400 border-border'}`}>
              <button
                onClick={() => setExpandedIds((prev) => { const next = new Set(prev); next.has(order.id) ? next.delete(order.id) : next.add(order.id); return next })}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-secondary/20 transition-colors text-left"
              >
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <span className="font-semibold text-sm truncate">{order.cliente_nombre}</span>
                  {order.cliente_telefono && (
                    <a href={`https://wa.me/54${order.cliente_telefono.replace(/\D/g, '')}?text=Hola%20${encodeURIComponent(order.cliente_nombre)}%2C%20te%20recuerdo%20que%20el%20plazo%20de%20devoluci%C3%B3n%20de%20la%20consignaci%C3%B3n%20est%C3%A1%20pr%C3%B3ximo.`}
                      target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                      className="text-xs text-green-600 hover:underline shrink-0">
                      📲 WA
                    </a>
                  )}
                  <span className="text-xs text-muted-foreground">{formatARS(order.total)}</span>
                  {pendiente > 0 && <span className="text-xs font-semibold text-orange-600">Debe {formatARS(pendiente)}</span>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs font-semibold ${v.color}`}>{v.label}</span>
                  {expanded ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
                </div>
              </button>

              {expanded && (
                <div className="border-t border-border px-4 py-3 space-y-3">
                  {/* Items */}
                  {(order.order_items ?? []).length > 0 && (
                    <div className="space-y-1">
                      {(order.order_items ?? []).map((item) => (
                        <div key={item.id} className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            {item.nombre_producto}{item.nombre_variante ? ` — ${item.nombre_variante}` : ''}
                            <span className="ml-1 font-medium text-foreground">×{item.cantidad}</span>
                          </span>
                          <span className="text-xs text-muted-foreground">{formatARS(item.precio_unitario * item.cantidad)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Fechas */}
                  <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                    {order.fecha_entrega && <span>📅 Entregado: <span className="font-medium text-foreground">{formatDate(order.fecha_entrega)}</span></span>}
                    {v.fecha && <span>⏳ Vence: <span className={`font-medium ${v.color}`}>{v.fecha.toLocaleDateString('es-AR')}</span></span>}
                    <span>Plazo: {order.dias_devolucion ?? 15} días</span>
                  </div>
                  {/* Acciones */}
                  <div className="flex gap-2 flex-wrap">
                    <ConsignacionToggle orderId={order.id} esConsignacion={true} diasDevolucion={order.dias_devolucion ?? 15} />
                    <OrderActions orderId={order.id} estado={order.estado} />
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Rentabilidad estimada (precio = costo × 3) ────────────────────────────────

function CostoEstimadoInput({ total }: { orderId: string; total: number; costoEstimado: number | null }) {
  if (!total) return null
  const costo = Math.round(total / 3)
  const ganancia = total - costo
  return (
    <p className="text-xs text-muted-foreground">
      Costo est. {formatARS(costo)} · <span className="text-green-600 dark:text-green-400 font-medium">~67% ganancia ({formatARS(ganancia)})</span>
    </p>
  )
}
