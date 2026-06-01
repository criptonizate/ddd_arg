import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getNegocio } from '@/lib/actions/negocios'
import { formatARS } from '@/lib/utils'
import NuevoPedidoNegocioButton from '@/components/admin/NuevoPedidoNegocioButton'
import NegocioDetalleView from '@/components/admin/NegocioDetalleView'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const negocio = await getNegocio(id)
  return { title: negocio?.nombre ?? 'Negocio' }
}

function pedidoTotal(pedido: any) {
  return (pedido.negocio_items ?? []).reduce(
    (s: number, i: any) => s + Number(i.precio_mayorista) * i.cantidad,
    0
  )
}

export default async function NegocioDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const negocio = await getNegocio(id)
  if (!negocio) notFound()

  const totalEntregado = negocio.negocio_pedidos
    .filter((p) => p.entregado_at)
    .reduce((s, p) => s + pedidoTotal(p), 0)

  const totalPendiente = negocio.negocio_pedidos
    .filter((p) => !p.entregado_at)
    .reduce((s, p) => s + pedidoTotal(p), 0)

  const pedidosPendientes = negocio.negocio_pedidos.filter((p) => !p.entregado_at).length

  return (
    <div className="space-y-6">
      {/* Breadcrumb + header */}
      <div>
        <Link
          href="/admin/negocios"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors mb-3 inline-flex items-center gap-1"
        >
          ← Negocios
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">{negocio.nombre}</h1>
            {negocio.contacto && (
              <p className="text-sm text-muted-foreground mt-0.5">{negocio.contacto}</p>
            )}
          </div>
          <NuevoPedidoNegocioButton negocioId={negocio.id} negocioNombre={negocio.nombre} />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Pedidos</p>
          <p className="text-2xl font-bold">{negocio.negocio_pedidos.length}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Total entregado</p>
          <p className="text-xl font-bold">{formatARS(totalEntregado)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Pendiente de entrega</p>
          <p className={`text-xl font-bold ${totalPendiente > 0 ? 'text-orange-600' : ''}`}>
            {formatARS(totalPendiente)}
          </p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Sin entregar</p>
          <p className={`text-2xl font-bold ${pedidosPendientes > 0 ? 'text-orange-600' : ''}`}>
            {pedidosPendientes}
          </p>
        </div>
      </div>

      {/* Pedidos */}
      <NegocioDetalleView negocio={negocio} />
    </div>
  )
}
