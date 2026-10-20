import { getInsumosDisponibles } from '@/lib/actions/insumos'
import { getMembresiaCliente } from '@/lib/actions/filamento-pedidos'
import { createClient } from '@/lib/supabase/server'
import InsumosShop from '@/components/store/InsumosShop'

export const metadata = { title: 'Insumos — DDD ARG' }
export const dynamic = 'force-dynamic'

export default async function InsumosPage() {
  const supabase = await createClient()
  const [insumos, { data: { user } }] = await Promise.all([
    getInsumosDisponibles(),
    supabase.auth.getUser(),
  ])

  const membresia = user ? await getMembresiaCliente(user.id) : null

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 py-6 sm:py-10">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold mb-1">Insumos</h1>
        <p className="text-muted-foreground text-xs sm:text-sm">
          Suministros para impresión 3D · Descuentos mayoristas automáticos
        </p>
      </div>
      <InsumosShop
        insumos={insumos}
        initialUser={user}
        membresia={membresia}
      />
    </div>
  )
}
