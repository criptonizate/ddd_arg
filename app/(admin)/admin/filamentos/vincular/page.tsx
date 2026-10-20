import { getVentasAgrupadasSinUsuario, getUsuariosRegistrados } from '@/lib/actions/filamentos'
import VincularVentasClient from '@/components/admin/VincularVentasClient'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata = { title: 'Vincular historial de ventas' }
export const dynamic = 'force-dynamic'

export default async function VincularVentasPage() {
  const [grupos, usuarios] = await Promise.all([
    getVentasAgrupadasSinUsuario(),
    getUsuariosRegistrados(),
  ])

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/admin/filamentos" className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-xl font-bold">🔗 Vincular historial de ventas</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Asigná las ventas antiguas a los clientes que ya se registraron
          </p>
        </div>
      </div>

      <VincularVentasClient grupos={grupos} usuarios={usuarios} />
    </div>
  )
}
