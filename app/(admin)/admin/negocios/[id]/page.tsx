import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getNegocio, pedidoTotal } from '@/lib/actions/negocios'
import { formatARS } from '@/lib/utils'
import NuevoPedidoNegocioButton from '@/components/admin/NuevoPedidoNegocioButton'
import NegocioDetalleView from '@/components/admin/NegocioDetalleView'
import FiltroMes from '@/components/admin/FiltroMes'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const negocio = await getNegocio(id)
  return { title: negocio?.nombre ?? 'Negocio' }
}

export default async function NegocioDetallePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ mes?: string }>
}) {
  const { id } = await params
  const { mes } = await searchParams
  const negocio = await getNegocio(id)
  if (!negocio) notFound()

  // Mapa de precio mayorista por producto (último precio encontrado)
  const precioMap = new Map<string, number>()
  for (const pedido of negocio.negocio_pedidos) {
    for (const item of pedido.negocio_items) {
      precioMap.set(item.nombre_producto.toLowerCase().trim(), Number(item.precio_mayorista))
    }
  }

  // Meses disponibles (de pedidos y egresos)
  const mesesSet = new Set<string>()
  for (const p of negocio.negocio_pedidos) mesesSet.add(p.fecha.slice(0, 7))
  for (const e of negocio.negocio_egresos) mesesSet.add(e.fecha.slice(0, 7))
  const mesesDisponibles = Array.from(mesesSet).sort().reverse()

  // Filtrar por mes si se seleccionó uno
  const pedidosFiltrados = mes
    ? negocio.negocio_pedidos.filter((p) => p.fecha.startsWith(mes) || (p.entregado_at && p.entregado_at.startsWith(mes)))
    : negocio.negocio_pedidos

  const egresosFiltrados = mes
    ? negocio.negocio_egresos.filter((e) => e.fecha.startsWith(mes))
    : negocio.negocio_egresos

  // Modelo consignación: se entrega primero, se cobra cuando el negocio vende
  // Cobrado = egresos tipo vendido × precio mayorista
  const totalCobrado = egresosFiltrados
    .filter((e) => e.tipo === 'vendido')
    .reduce((s, e) => {
      const precio = precioMap.get(e.nombre_producto.toLowerCase().trim()) ?? 0
      return s + e.cantidad * precio
    }, 0)

  // Entregado en el período (base para pendiente de cobro)
  const totalEntregado = negocio.negocio_pedidos
    .filter((p) => p.entregado_at)
    .reduce((s, p) => s + pedidoTotal(p), 0)

  // Pendiente de cobro = todo lo entregado (histórico) - cobrado - devuelto
  const totalDevuelto = negocio.negocio_egresos
    .filter((e) => e.tipo === 'devuelto')
    .reduce((s, e) => {
      const precio = precioMap.get(e.nombre_producto.toLowerCase().trim()) ?? 0
      return s + e.cantidad * precio
    }, 0)

  const totalCobradoHistorico = negocio.negocio_egresos
    .filter((e) => e.tipo === 'vendido')
    .reduce((s, e) => {
      const precio = precioMap.get(e.nombre_producto.toLowerCase().trim()) ?? 0
      return s + e.cantidad * precio
    }, 0)

  const pendienteDeCobro = Math.max(0, totalEntregado - totalCobradoHistorico - totalDevuelto)

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

      {/* Filtro de mes */}
      {mesesDisponibles.length > 1 && (
        <FiltroMes meses={mesesDisponibles} mesActual={mes} />
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Total entregado</p>
          <p className="text-xl font-bold">{formatARS(totalEntregado)}</p>
          <p className="text-xs text-muted-foreground mt-1">en consignación</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">💰 Cobrado{mes ? ' este mes' : ''}</p>
          <p className={`text-xl font-bold ${totalCobrado > 0 ? 'text-green-600' : ''}`}>
            {formatARS(totalCobrado)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">productos vendidos</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">⏳ Pendiente de cobro</p>
          <p className={`text-xl font-bold ${pendienteDeCobro > 0 ? 'text-orange-600' : ''}`}>
            {formatARS(pendienteDeCobro)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">en stock del negocio</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Pedidos sin entregar</p>
          <p className={`text-2xl font-bold ${pedidosPendientes > 0 ? 'text-orange-600' : ''}`}>
            {pedidosPendientes}
          </p>
        </div>
      </div>

      {/* Detalle de stock y pedidos */}
      <NegocioDetalleView negocio={negocio} />
    </div>
  )
}
