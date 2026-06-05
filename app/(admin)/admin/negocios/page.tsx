import Link from 'next/link'
import { getNegocios, pedidoTotal } from '@/lib/actions/negocios'
import NuevoNegocioButton from '@/components/admin/NuevoNegocioButton'
import { formatARS, formatDateShort } from '@/lib/utils'

export const metadata = { title: 'Negocios' }

export default async function NegociosPage() {
  const negocios = await getNegocios()

  const totalGeneral = negocios.reduce(
    (s, n) => s + n.negocio_pedidos.reduce((sp, p) => sp + pedidoTotal(p), 0),
    0
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">🏪 Negocios</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {negocios.length} negocio{negocios.length !== 1 ? 's' : ''}
            {totalGeneral > 0 && (
              <span className="ml-2 font-semibold text-foreground">— {formatARS(totalGeneral)} total</span>
            )}
          </p>
        </div>
        <NuevoNegocioButton />
      </div>

      {negocios.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-card border border-border rounded-xl">
          <p className="text-4xl mb-3">🏪</p>
          <p className="font-medium">Sin negocios todavía</p>
          <p className="text-sm text-muted-foreground mt-1">Agregá el primer negocio con el botón de arriba</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {negocios.map((negocio) => {
            const total = negocio.negocio_pedidos.reduce((s, p) => s + pedidoTotal(p), 0)
            const pendientes = negocio.negocio_pedidos.filter((p) => !p.entregado_at).length
            const ultimoPedido = negocio.negocio_pedidos[0]

            return (
              <Link
                key={negocio.id}
                href={`/admin/negocios/${negocio.id}`}
                className="bg-card border border-border rounded-xl p-5 shadow-sm hover:border-foreground/30 hover:shadow-md transition-all group block"
              >
                <div className="flex items-start justify-between gap-2 mb-4">
                  <div>
                    <h3 className="font-semibold text-base group-hover:underline">{negocio.nombre}</h3>
                    {negocio.contacto && (
                      <p className="text-xs text-muted-foreground mt-0.5">{negocio.contacto}</p>
                    )}
                  </div>
                  <span className="text-2xl">🏪</span>
                </div>

                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total entregado</span>
                    <span className="font-bold">{formatARS(total)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Pedidos</span>
                    <span>{negocio.negocio_pedidos.length}</span>
                  </div>
                  {pendientes > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Pendientes de entrega</span>
                      <span className="font-semibold text-orange-600">{pendientes}</span>
                    </div>
                  )}
                  {ultimoPedido && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Último pedido</span>
                      <span className="text-xs">{formatDateShort(ultimoPedido.fecha)}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-border text-xs text-muted-foreground group-hover:text-foreground transition-colors text-right">
                  Ver detalle →
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
