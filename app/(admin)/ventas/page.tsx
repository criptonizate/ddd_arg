import { getOrders } from '@/lib/actions/orders'
import { formatARS, formatDateTime, ESTADO_LABELS, ESTADO_COLORS } from '@/lib/utils'
import { ShoppingCart, Plus } from 'lucide-react'
import OrderActions from '@/components/admin/OrderActions'
import ManualSaleButton from '@/components/admin/ManualSaleButton'
import type { OrderEstado } from '@/lib/supabase/types'

export const metadata = { title: 'Ventas' }

export default async function VentasPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>
}) {
  const { estado } = await searchParams
  const estadoFilter = estado as OrderEstado | undefined

  const orders = await getOrders({ estado: estadoFilter, limit: 50 })

  const ESTADOS: Array<{ value: string; label: string }> = [
    { value: '', label: 'Todos' },
    { value: 'pendiente', label: 'Pendientes' },
    { value: 'confirmada', label: 'Confirmadas' },
    { value: 'entregada', label: 'Entregadas' },
    { value: 'cancelada', label: 'Canceladas' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Ventas</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {orders.length} pedido{orders.length !== 1 ? 's' : ''}
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
          <p className="font-medium">Sin pedidos</p>
          <p className="text-sm text-muted-foreground mt-1">
            {estadoFilter ? `No hay pedidos ${ESTADO_LABELS[estadoFilter as OrderEstado]?.toLowerCase()}` : 'Aún no llegaron pedidos'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order: any) => (
            <div
              key={order.id}
              className="bg-card border border-border rounded-xl p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold">{order.cliente_nombre}</span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                        ESTADO_COLORS[order.estado as OrderEstado]
                      }`}
                    >
                      {ESTADO_LABELS[order.estado as OrderEstado]}
                    </span>
                    <span className="text-xs text-muted-foreground uppercase">
                      {order.origen}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mb-2">
                    {formatDateTime(order.created_at)} — {order.cliente_telefono}
                    {order.entrega === 'envio' && order.direccion_envio && (
                      <> — 📦 {order.direccion_envio}</>
                    )}
                  </div>

                  {/* Items */}
                  <div className="space-y-0.5">
                    {order.order_items?.map((item: any) => (
                      <p key={item.id} className="text-sm">
                        {item.products?.nombre} —{' '}
                        <span className="text-muted-foreground">
                          {item.product_variants?.nombre_variante}
                        </span>{' '}
                        × {item.cantidad}{' '}
                        <span className="font-medium">
                          {formatARS(item.precio_unitario * item.cantidad)}
                        </span>
                      </p>
                    ))}
                  </div>

                  {order.nota && (
                    <p className="text-xs text-muted-foreground mt-1 italic">📝 {order.nota}</p>
                  )}
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  <p className="text-lg font-bold">{formatARS(order.total)}</p>
                  <OrderActions orderId={order.id} estado={order.estado} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
