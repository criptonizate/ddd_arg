import { getOrders, getConsignacionesActivas } from '@/lib/actions/orders'
import ManualSaleButton from '@/components/admin/ManualSaleButton'
import NuevoPedidoButton from '@/components/admin/NuevoPedidoButton'
import VentasClient from '@/components/admin/VentasClient'

export const metadata = { title: 'Pedidos' }

function flattenOrders(orders: any[]) {
  return orders.map((o) => ({
    ...o,
    pide_facturacion: o.clientes?.pide_facturacion ?? false,
  }))
}

export default async function VentasPage() {
  const [activas, entregadas, local, consignaciones] = await Promise.all([
    getOrders({ estados: ['pendiente', 'confirmada', 'imprimiendo', 'listo'], limit: 200 }).then(flattenOrders),
    getOrders({ estados: ['entregada'], limit: 200 }).then(flattenOrders),
    getOrders({ estados: ['local'], limit: 500 }).then(flattenOrders),
    getConsignacionesActivas(),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">📦 Pedidos</h1>
        <div className="flex items-center gap-2">
          <NuevoPedidoButton />
          <ManualSaleButton />
        </div>
      </div>
      <VentasClient activas={activas as any} entregadas={entregadas as any} local={local as any} consignaciones={consignaciones as any} />
    </div>
  )
}
