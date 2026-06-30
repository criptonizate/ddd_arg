import { getOrders } from '@/lib/actions/orders'
import ManualSaleButton from '@/components/admin/ManualSaleButton'
import VentasClient from '@/components/admin/VentasClient'

export const metadata = { title: 'Ventas' }

export default async function VentasPage() {
  const [activas, entregadas, local] = await Promise.all([
    getOrders({ estados: ['pendiente', 'confirmada', 'imprimiendo', 'listo'], limit: 200 }),
    getOrders({ estados: ['entregada'], limit: 200 }),
    getOrders({ estados: ['local'], limit: 500 }),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">💸 Ventas</h1>
        <ManualSaleButton />
      </div>
      <VentasClient activas={activas as any} entregadas={entregadas as any} local={local as any} />
    </div>
  )
}
