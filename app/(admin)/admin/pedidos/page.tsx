import { getOrders } from '@/lib/actions/orders'
import NuevoPedidoButton from '@/components/admin/NuevoPedidoButton'
import PedidosClient from '@/components/admin/PedidosClient'

export const metadata = { title: 'Pedidos' }

export default async function PedidosPage() {
  const orders = await getOrders({ estado: 'pendiente', limit: 100 })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">📥 Pedidos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {orders.length} pedido{orders.length !== 1 ? 's' : ''} esperando confirmación
          </p>
        </div>
        <NuevoPedidoButton />
      </div>
      <PedidosClient orders={orders as any} />
    </div>
  )
}
