import { getNegocios } from '@/lib/actions/negocios'
import NuevoNegocioButton from '@/components/admin/NuevoNegocioButton'
import NegociosList from '@/components/admin/NegociosList'

export const metadata = { title: 'Negocios' }

export default async function NegociosPage() {
  const negocios = await getNegocios()

  const totalGeneral = negocios.reduce(
    (sum, n) =>
      sum +
      n.negocio_pedidos.reduce(
        (s, p) => s + p.negocio_items.reduce((si, i) => si + Number(i.precio_mayorista) * i.cantidad, 0),
        0
      ),
    0
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">🏪 Negocios</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {negocios.length} negocio{negocios.length !== 1 ? 's' : ''}
            {negocios.length > 0 && (
              <span className="ml-2 font-semibold text-foreground">
                — {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(totalGeneral)} total entregado
              </span>
            )}
          </p>
        </div>
        <NuevoNegocioButton />
      </div>
      <NegociosList negocios={negocios} />
    </div>
  )
}
