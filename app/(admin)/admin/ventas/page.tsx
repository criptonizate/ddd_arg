import { getOrders, getConsignacionesActivas } from '@/lib/actions/orders'
import { getClientesFacturacion } from '@/lib/actions/clientes'
import ManualSaleButton from '@/components/admin/ManualSaleButton'
import NuevoPedidoButton from '@/components/admin/NuevoPedidoButton'
import VentasClient from '@/components/admin/VentasClient'

export const metadata = { title: 'Pedidos' }

export default async function VentasPage() {
  const [activas, entregadas, local, consignaciones] = await Promise.all([
    getOrders({ estados: ['pendiente', 'confirmada', 'imprimiendo', 'listo'], limit: 200 }),
    getOrders({ estados: ['entregada'], limit: 200 }),
    getOrders({ estados: ['local'], limit: 500 }),
    getConsignacionesActivas(),
  ])

  // Buscar pide_facturacion por separado (falla silencioso si migración no corrió aún)
  const allOrders = [...activas, ...entregadas, ...local]
  const clienteIds = [...new Set(allOrders.map((o: any) => o.cliente_id).filter(Boolean))]
  const facturacionMap = await getClientesFacturacion(clienteIds)

  function withFacturacion(orders: any[]) {
    return orders.map((o) => ({ ...o, pide_facturacion: facturacionMap[o.cliente_id] ?? false }))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">📦 Pedidos</h1>
        <div className="flex items-center gap-2">
          <NuevoPedidoButton />
          <ManualSaleButton />
        </div>
      </div>
      <VentasClient activas={withFacturacion(activas) as any} entregadas={withFacturacion(entregadas) as any} local={withFacturacion(local) as any} consignaciones={consignaciones as any} />
    </div>
  )
}
