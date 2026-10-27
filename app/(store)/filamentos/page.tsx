import { getFilamentosDisponibles, getFilamentosAgotados, getMisAlertasStock } from '@/lib/actions/filamentos'
import { getMembresiaCliente } from '@/lib/actions/filamento-pedidos'
import type { MembresiaStatus } from '@/lib/actions/filamento-pedidos'
import { getSaldoCoins } from '@/lib/actions/ddd-coins'
import { createClient } from '@/lib/supabase/server'
import FilamentosShop from '@/components/store/FilamentosShop'

export const metadata = { title: 'Filamentos — DDD ARG' }
export const dynamic = 'force-dynamic'

export default async function FilamentosPage() {
  const supabase = await createClient()
  const [raw, agotados, { data: { user } }] = await Promise.all([
    getFilamentosDisponibles(),
    getFilamentosAgotados(),
    supabase.auth.getUser(),
  ])

  const [membresia, alertasIniciales, saldoCoins] = await Promise.all([
    user ? getMembresiaCliente(user.id) : Promise.resolve(null),
    user ? getMisAlertasStock() : Promise.resolve([]),
    user ? getSaldoCoins(user.id).catch(() => 0) : Promise.resolve(0),
  ])

  const filamentos = [...raw].sort((a, b) => {
    const stockA = a.rollos_cerrados * a.peso_rollo_gr + a.gramos_sueltos
    const stockB = b.rollos_cerrados * b.peso_rollo_gr + b.gramos_sueltos
    return stockB - stockA
  })

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 py-6 sm:py-10">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold mb-1">Filamentos</h1>
        <p className="text-muted-foreground text-xs sm:text-sm">
          Stock disponible · Precio por kg · Descuentos por volumen automáticos
        </p>
      </div>
      <FilamentosShop
        filamentos={filamentos}
        agotados={agotados}
        alertasIniciales={alertasIniciales}
        initialUser={user}
        membresia={membresia}
        saldoCoins={saldoCoins}
      />
    </div>
  )
}
