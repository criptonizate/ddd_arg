'use client'

import { useState, useMemo } from 'react'
import { formatARS, formatDateTime, ESTADO_LABELS, ESTADO_COLORS, ORIGEN_LABELS, METODO_PAGO_LABELS } from '@/lib/utils'
import { Search, X, AlertTriangle, Package } from 'lucide-react'
import OrderActions from './OrderActions'
import OrderSenaInput from './OrderSenaInput'
import OrderNotaInternaInput from './OrderNotaInternaInput'
import OrderPriorityToggle from './OrderPriorityToggle'
import FechaEntregaInput from './FechaEntregaInput'
import CopyButton from './CopyButton'
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
  nota_interna?: string | null
  fecha_entrega?: string | null
  total: number
  sena?: number
  prioridad?: boolean
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

function OrderCard({ order }: { order: Order }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <OrderPriorityToggle orderId={order.id} prioridad={order.prioridad ?? false} />
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

      <div className="flex items-start gap-6 flex-wrap">
        <div>
          <span className="text-xs text-muted-foreground block">Cliente</span>
          <span className="font-semibold text-sm">{order.cliente_nombre}</span>
        </div>
        {order.cliente_telefono && (
          <div>
            <span className="text-xs text-muted-foreground block">Teléfono</span>
            <div className="flex items-center gap-1">
              <a href={`tel:${order.cliente_telefono}`} className="text-sm font-medium hover:underline">{order.cliente_telefono}</a>
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
        <FechaEntregaInput orderId={order.id} fechaEntrega={order.fecha_entrega ?? null} />
      </div>

      <div className="border-t border-border pt-3">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">📦 Productos</span>
        <div className="space-y-2">
          {order.order_items?.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1 text-sm">
                <span className="font-medium">{item.products?.nombre ?? item.nombre_producto}</span>
                {(item.product_variants?.nombre_variante || item.nombre_variante) && (
                  <span className="text-muted-foreground"> — {item.product_variants?.nombre_variante ?? item.nombre_variante}</span>
                )}
                <span className="text-muted-foreground"> × {item.cantidad}</span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {item.product_variants?.stock != null && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Package size={10} />{item.product_variants.stock} en stock
                  </span>
                )}
                <span className="text-sm font-semibold">{formatARS(item.precio_unitario * item.cantidad)}</span>
              </div>
            </div>
          ))}
        </div>
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
        </div>
        <OrderActions orderId={order.id} estado={order.estado} />
      </div>
    </div>
  )
}

export default function PedidosClient({ orders }: { orders: Order[] }) {
  const [search, setSearch] = useState('')

  const urgentes = useMemo(() => orders.filter((o) => o.prioridad), [orders])
  const normales = useMemo(() => orders.filter((o) => !o.prioridad), [orders])

  const filtered = useMemo(() => {
    if (!search.trim()) return orders
    const q = search.toLowerCase()
    return orders.filter(
      (o) =>
        o.cliente_nombre.toLowerCase().includes(q) ||
        o.cliente_telefono?.toLowerCase().includes(q) ||
        o.nota?.toLowerCase().includes(q) ||
        o.order_items?.some((i) => (i.products?.nombre ?? i.nombre_producto).toLowerCase().includes(q))
    )
  }, [orders, search])

  const filteredUrgentes = filtered.filter((o) => o.prioridad)
  const filteredNormales = filtered.filter((o) => !o.prioridad)

  return (
    <div className="space-y-6">
      {/* Barra de búsqueda */}
      {orders.length > 0 && (
        <div className="relative max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar cliente, producto..."
            className="w-full pl-8 pr-8 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X size={13} />
            </button>
          )}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-card border border-border rounded-xl">
          <p className="font-medium">{search ? 'Sin resultados' : '🎉 Todo despejado'}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {search ? `No se encontró "${search}"` : 'No hay pedidos pendientes por ahora'}
          </p>
          {search && (
            <button onClick={() => setSearch('')} className="mt-3 text-xs underline text-muted-foreground hover:text-foreground">
              Limpiar búsqueda
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {filteredUrgentes.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={16} className="text-red-500" />
                <h2 className="font-semibold text-red-600">🔥 Prioridad Urgente</h2>
                <span className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">{filteredUrgentes.length}</span>
              </div>
              <div className="space-y-3 border-l-2 border-red-300 pl-4">
                {filteredUrgentes.map((order) => <OrderCard key={order.id} order={order} />)}
              </div>
            </div>
          )}
          {filteredNormales.length > 0 && (
            <div>
              {filteredUrgentes.length > 0 && (
                <div className="flex items-center gap-2 mb-3">
                  <h2 className="font-semibold text-muted-foreground">😌 Sin apuro</h2>
                  <span className="text-xs text-muted-foreground bg-secondary border border-border rounded-full px-2 py-0.5">{filteredNormales.length}</span>
                </div>
              )}
              <div className="space-y-3">
                {filteredNormales.map((order) => <OrderCard key={order.id} order={order} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
