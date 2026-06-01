import { getOrders } from '@/lib/actions/orders'
import ManualSaleButton from '@/components/admin/ManualSaleButton'
import VentasClient from '@/components/admin/VentasClient'

export const metadata = { title: 'Ventas' }

export default async function VentasPage() {
  const [listas, entregadas] = await Promise.all([
    getOrders({ estados: ['listo'], limit: 100 }),
    getOrders({ estados: ['entregada'], limit: 200 }),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">💸 Ventas</h1>
        <ManualSaleButton />
      </div>
      <VentasClient listas={listas as any} entregadas={entregadas as any} />
    </div>
  )
}
