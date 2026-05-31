import { getOrders } from '@/lib/actions/orders'
import { formatARS, formatDateTime, ESTADO_LABELS, ESTADO_COLORS, ORIGEN_LABELS, METODO_PAGO_LABELS } from '@/lib/utils'
import { ShoppingCart, AlertTriangle, Package } from 'lucide-react'
import OrderActions from '@/components/admin/OrderActions'
import ManualSaleButton from '@/components/admin/ManualSaleButton'
import OrderPriorityToggle from '@/components/admin/OrderPriorityToggle'
import OrderSenaInput from '@/components/admin/OrderSenaInput'
import CopyButton from '@/components/admin/CopyButton'
import type { OrderEstado } from '@/lib/supabase/types'

export const metadata = { title: 'Ventas' }

export default async function VentasPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>
}) {
  const { estado } = await searchParams
  const estadoFilter = estado as OrderEstado | undefined

  const ESTADOS_VENTAS: OrderEstado[] = ['confirmada', 'listo', 'entregada', 'cancelada']
  const orders = await getOrders({
    estados: estadoFilter ? [estadoFilter] : ESTADOS_VENTAS,
    limit: 100,
  })

  const ESTADOS: Array<{ value: string; label: string }> = [
    { value: '', label: 'Todas' },
    { value: 'confirmada', label: 'Confirmadas' },
    { value: 'listo', label: 'Listas' },
    { value: 'entregada', label: 'Entregadas' },
    { value: 'cancelada', label: 'Canceladas' },
  ]

  const urgentes = orders.filter((o: any) => o.prioridad)
  const normales = orders.filter((o: any) => !o.prioridad)
  const totalAcumulado = orders.reduce((sum: number, o: any) => sum + Number(o.total), 0)

  function OrderCard({ order }: { order: any }) {
    return (
      <div className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <OrderPriorityToggle orderId={order.id} prioridad={order.prioridad ?? false} />
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${ESTADO_COLORS[order.estado as OrderEstado]}`}>
              {ESTADO_LABELS[order.estado as OrderEstado]}
            </span>
            <span className="text-xs text-muted-foreground">{ORIGEN_LABELS[order.origen] ?? order.origen}</span>
            {order.metodo_pago && (
              <span className="text-xs text-muted-foreground">{METODO_PAGO_LABELS[order.metodo_pago] ?? order.metodo_pago}</span>
            )}
          </div>
          <span className="text-xs text-muted-foreground shrink-0">{formatDateTime(order.created_at)}</span>
        </div>

        {/* Datos del cliente */}
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
          <div className="space-y-2">
            {order.order_items?.map((item: any) => (
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">💸 Ventas</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {orders.length} venta{orders.length !== 1 ? 's' : ''}
            {orders.length > 0 && (
              <span className="ml-2 font-semibold text-foreground">— {formatARS(totalAcumulado)}</span>
            )}
          </p>
        </div>
        <ManualSaleButton />
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        {ESTADOS.map((e) => (
          <a
            key={e.value}
            href={e.value ? `/admin/ventas?estado=${e.value}` : '/admin/ventas'}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              (estadoFilter ?? '') === e.value
                ? 'bg-foreground text-primary-foreground border-foreground'
                : 'border-border hover:border-foreground/40'
            }`}
          >
            {e.label}
          </a>
        ))}
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-card border border-border rounded-xl">
          <ShoppingCart size={40} className="text-muted-foreground mb-3" />
          <p className="font-medium">🎉 Sin ventas por filtrar</p>
          <p className="text-sm text-muted-foreground mt-1">
            {estadoFilter ? `No hay ventas ${ESTADO_LABELS[estadoFilter as OrderEstado]?.toLowerCase()}` : 'Aún no hay ventas'}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {urgentes.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={16} className="text-red-500" />
                <h2 className="font-semibold text-red-600">🔥 Prioridad Urgente</h2>
                <span className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">{urgentes.length}</span>
              </div>
              <div className="space-y-3 border-l-2 border-red-300 pl-4">
                {urgentes.map((order: any) => <OrderCard key={order.id} order={order} />)}
              </div>
            </div>
          )}
          {normales.length > 0 && (
            <div>
              {urgentes.length > 0 && (
                <div className="flex items-center gap-2 mb-3">
                  <h2 className="font-semibold text-muted-foreground">😌 Sin apuro</h2>
                  <span className="text-xs text-muted-foreground bg-secondary border border-border rounded-full px-2 py-0.5">{normales.length}</span>
                </div>
              )}
              <div className="space-y-3">
                {normales.map((order: any) => <OrderCard key={order.id} order={order} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
