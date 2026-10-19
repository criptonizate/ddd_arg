import { getFilamentosDisponibles } from '@/lib/actions/filamentos'
import FilamentosShop from '@/components/store/FilamentosShop'

export const metadata = { title: 'Filamentos — DDD ARG' }
export const dynamic = 'force-dynamic'

export default async function FilamentosPage() {
  const filamentos = await getFilamentosDisponibles()

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 py-6 sm:py-10">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold mb-1">Filamentos</h1>
        <p className="text-muted-foreground text-xs sm:text-sm">
          Stock disponible · Precio por kg · Descuentos por volumen automáticos
        </p>
      </div>
      <FilamentosShop filamentos={filamentos} />
    </div>
  )
}
