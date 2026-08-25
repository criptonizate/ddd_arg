import { getColaImpresion } from '@/lib/actions/orders'
import { formatDate } from '@/lib/utils'
import OrderItemCheck from '@/components/admin/OrderItemCheck'
import Link from 'next/link'

export const metadata = { title: 'Producción' }

export default async function ProduccionPage() {
  const cola = await getColaImpresion()

  // Agrupar por order_id
  const byOrder = new Map<string, typeof cola>()
  for (const item of cola) {
    const prev = byOrder.get(item.order_id) ?? []
    prev.push(item)
    byOrder.set(item.order_id, prev)
  }

  // Ordenar pedidos: primero con fecha_entrega más próxima, luego sin fecha
  const grupos = Array.from(byOrder.entries())
    .map(([orderId, items]) => ({ orderId, items, fecha_entrega: items[0].fecha_entrega }))
    .sort((a, b) => {
      if (a.fecha_entrega && b.fecha_entrega) return a.fecha_entrega.localeCompare(b.fecha_entrega)
      if (a.fecha_entrega) return -1
      if (b.fecha_entrega) return 1
      return 0
    })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">🏭 Cola de impresión</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Items pendientes de imprimir — {cola.length} ítem{cola.length !== 1 ? 's' : ''} en {grupos.length} pedido{grupos.length !== 1 ? 's' : ''}
        </p>
      </div>

      {grupos.length === 0 ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-10 text-center dark:bg-green-950/20 dark:border-green-800">
          <p className="text-3xl mb-2">✅</p>
          <p className="text-sm font-medium text-green-800 dark:text-green-300">Todo al día — sin items pendientes</p>
        </div>
      ) : (
        <div className="space-y-3">
          {grupos.map(({ orderId, items, fecha_entrega }) => {
            const cliente = items[0].cliente_nombre
            const estado = items[0].estado

            let urgencia = ''
            if (fecha_entrega) {
              const hoy = new Date()
              hoy.setHours(0, 0, 0, 0)
              const entrega = new Date(fecha_entrega + 'T00:00:00')
              const diff = Math.ceil((entrega.getTime() - hoy.getTime()) / 86400000)
              if (diff < 0) urgencia = 'vencido'
              else if (diff === 0) urgencia = 'hoy'
              else if (diff === 1) urgencia = 'mañana'
              else if (diff <= 3) urgencia = `en ${diff} días`
            }

            const headerBg = urgencia === 'vencido'
              ? 'bg-red-50 border-red-300 dark:bg-red-950/30 dark:border-red-700'
              : urgencia === 'hoy' || urgencia === 'mañana'
              ? 'bg-orange-50 border-orange-300 dark:bg-orange-950/30 dark:border-orange-700'
              : 'bg-card border-border'

            return (
              <div key={orderId} className={`border rounded-xl overflow-hidden shadow-sm ${headerBg}`}>
                <div className="flex items-center justify-between px-4 py-3 gap-3 flex-wrap">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-semibold text-sm">{cliente}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                      estado === 'imprimiendo'
                        ? 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700'
                        : 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700'
                    }`}>
                      {estado === 'imprimiendo' ? '🖨️ Imprimiendo' : '✅ Confirmada'}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    {fecha_entrega && (
                      <span className={`text-xs font-medium ${urgencia === 'vencido' ? 'text-red-600' : urgencia === 'hoy' || urgencia === 'mañana' ? 'text-orange-600' : 'text-muted-foreground'}`}>
                        📅 {formatDate(fecha_entrega)}{urgencia ? ` — ${urgencia}` : ''}
                      </span>
                    )}
                    <Link href={`/admin/ventas`} className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2">
                      Ver pedido →
                    </Link>
                  </div>
                </div>

                <div className="divide-y divide-border border-t border-border">
                  {items.map((item) => (
                    <div key={item.order_item_id} className="flex items-center justify-between px-4 py-2.5 gap-3 bg-background/60">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm font-medium truncate">{item.nombre_producto}</span>
                        {item.nombre_variante && (
                          <span className="text-xs text-muted-foreground shrink-0">· {item.nombre_variante}</span>
                        )}
                      </div>
                      <OrderItemCheck
                        itemId={item.order_item_id}
                        impreso={item.impreso}
                        cantidad={item.cantidad}
                        cantidadImpresa={item.cantidad_impresa}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
