import { getFilamentosDisponibles } from '@/lib/actions/filamentos'
import FilamentosShop from '@/components/store/FilamentosShop'

export const metadata = { title: 'Filamentos — DDD ARG' }
export const dynamic = 'force-dynamic'

export default async function FilamentosPage() {
  const filamentos = await getFilamentosDisponibles()

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Filamentos</h1>
        <p className="text-muted-foreground text-sm">
          Stock disponible · Precio por rollo de 1kg · Descuentos por volumen automáticos
        </p>
      </div>
      <FilamentosShop filamentos={filamentos} />
    </div>
  )
}
