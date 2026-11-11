import { getInsumos, getInsumoPedidos } from '@/lib/actions/insumos'
import InsumosClient from '@/components/admin/InsumosClient'

export const metadata = { title: 'Insumos — Admin' }
export const dynamic = 'force-dynamic'

export default async function InsumosAdminPage() {
  const [insumos, pedidos] = await Promise.all([
    getInsumos(),
    getInsumoPedidos(),
  ])
  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold">Insumos</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Gestión de catálogo y pedidos de insumos</p>
      </div>
      <InsumosClient initialInsumos={insumos} initialPedidos={pedidos} />
    </div>
  )
}
