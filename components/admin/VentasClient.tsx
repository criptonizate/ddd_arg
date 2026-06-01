'use client'

import { useState } from 'react'
import { formatARS, formatDateTime, ESTADO_LABELS, ESTADO_COLORS, ORIGEN_LABELS, METODO_PAGO_LABELS } from '@/lib/utils'
import { ChevronDown, ChevronUp, Package } from 'lucide-react'
import OrderActions from '@/components/admin/OrderActions'
import OrderSenaInput from '@/components/admin/OrderSenaInput'
import CopyButton from '@/components/admin/CopyButton'
import type { OrderEstado } from '@/lib/supabase/types'

interface Order {
  id: string
  estado: OrderEstado
  origen: string
  metodo_pago?: string
  created_at: string
  cliente_nombre: string
  cliente_telefono?: string
  entrega: string
  direccion_envio?: string
  nota?: string
  total: number
  sena?: number
  order_items?: {
    id: string
    products?: { nombre: string }
    nombre_producto: string
    product_variants?: { nombre_variante: string; stock: number }
    nombre_variante?: string
    cantidad: number
    precio_unitario: number
  }[]
}

type Tab = 'listas' | 'entregadas'

export default function VentasClient({
  listas,
  entregadas,
}: {
  listas: Order[]
  entregadas: Order[]
}) {
  const [tab, setTab] = useState<Tab>('listas')
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const orders = tab === 'listas' ? listas : entregadas
  const total = orders.reduce((sum, o) => sum + Number(o.total), 0)

  return (
    <div className="space-y-5">
      {/* Tabs */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setTab('listas')}
          className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
            tab === 'listas'
              ? 'bg-foreground text-primary-foreground border-foreground'
              : 'border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground'
          }`}
        >
          📦 Listas
          {listas.length > 0 && (
            <span className={`ml-2 text-xs font-bold ${tab === 'listas' ? 'opacity-70' : 'text-muted-foreground'}`}>
              {listas.length}
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
        </button>
        {total > 0 && (
          <span className="ml-auto text-sm font-semibold text-muted-foreground">
            {formatARS(total)}
          </span>
        )}
      </div>

      {/* Lista de órdenes */}
      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-card border border-border rounded-xl">
          <p className="font-medium">Sin órdenes</p>
          <p className="text-sm text-muted-foreground mt-1">
            No hay ventas {tab === 'listas' ? 'listas para entregar' : 'entregadas'} por ahora
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) =>
            tab === 'listas' ? (
              <FullCard key={order.id} order={order} />
            ) : (
              <CollapsibleCard
                key={order.id}
                order={order}
                expanded={expandedIds.has(order.id)}
                onToggle={() => toggleExpanded(order.id)}
              />
            )
          )}
        </div>
      )}
    </div>
  )
}

function FullCard({ order }: { order: Order }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${ESTADO_COLORS[order.estado]}`}>
            {ESTADO_LABELS[order.estado]}
          </span>
          <span className="text-xs text-muted-foreground">{ORIGEN_LABELS[order.origen] ?? order.origen}</span>
          {order.metodo_pago && (
            <span className="text-xs text-muted-foreground">{METODO_PAGO_LABELS[order.metodo_pago] ?? order.metodo_pago}</span>
          )}
        </div>
        <span className="text-xs text-muted-foreground shrink-0">{formatDateTime(order.created_at)}</span>
      </div>

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

      {/* Productos */}
      <div className="border-t border-border pt-3">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">📦 Productos</span>
        <div className="space-y-1.5">
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
      </div>

      {order.nota && <p className="text-xs text-muted-foreground italic">📝 {order.nota}</p>}

      {/* Total + Seña + Acciones */}
      <div className="border-t border-border pt-3 flex items-end justify-between gap-3 flex-wrap">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Total:</span>
            <span className="text-base font-bold">{formatARS(order.total)}</span>
          </div>
          <OrderSenaInput orderId={order.id} sena={order.sena ?? 0} total={order.total} />
        </div>
        <OrderActions orderId={order.id} estado={order.estado} />
      </div>
    </div>
  )
}

function CollapsibleCard({
  order,
  expanded,
  onToggle,
}: {
  order: Order
  expanded: boolean
  onToggle: () => void
}) {
  const pendiente = order.total - (order.sena ?? 0)
  const pagado = (order.sena ?? 0) >= order.total && order.total > 0

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
      {/* Cabecera siempre visible */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-secondary/30 transition-colors text-left"
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border shrink-0 ${ESTADO_COLORS[order.estado]}`}>
            {ESTADO_LABELS[order.estado]}
          </span>
          <span className="font-semibold text-sm truncate">{order.cliente_nombre}</span>
          {pagado ? (
            <span className="text-xs text-green-600 font-medium shrink-0">✓ Pagado</span>
          ) : pendiente > 0 && (order.sena ?? 0) > 0 ? (
            <span className="text-xs text-orange-600 shrink-0">Debe {formatARS(pendiente)}</span>
          ) : null}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="font-bold text-sm">{formatARS(order.total)}</span>
          <span className="text-xs text-muted-foreground">{formatDateTime(order.created_at)}</span>
          {expanded ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
        </div>
      </button>

      {/* Detalle expandible */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
          {/* Productos */}
          <div className="space-y-1.5">
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

          {/* Total + Seña + teléfono */}
          <div className="border-t border-border pt-3 flex items-end justify-between gap-3 flex-wrap">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Total:</span>
                <span className="text-base font-bold">{formatARS(order.total)}</span>
              </div>
              <OrderSenaInput orderId={order.id} sena={order.sena ?? 0} total={order.total} />
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
