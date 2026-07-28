import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getCliente } from '@/lib/actions/clientes'
import { formatARS, formatDateTime, ESTADO_LABELS, ESTADO_COLORS } from '@/lib/utils'
import ClienteEditForm from '@/components/admin/ClienteEditForm'
import type { OrderEstado } from '@/lib/supabase/types'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const c = await getCliente(id)
  return { title: c?.nombre ?? 'Cliente' }
}

export default async function ClienteDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const cliente = await getCliente(id)
  if (!cliente) notFound()

  const pedidosValidos = cliente.pedidos.filter((p) => p.estado !== 'cancelada')
  const ticketPromedio = pedidosValidos.length > 0 ? cliente.totalGastado / pedidosValidos.length : 0

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div>
        <Link href="/admin/clientes" className="text-xs text-muted-foreground hover:text-foreground transition-colors mb-3 inline-flex items-center gap-1">
          ← Clientes
        </Link>
        <h1 className="text-2xl font-bold mt-1">{cliente.nombre}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna izquierda: datos del cliente (editables) */}
        <div className="lg:col-span-1 space-y-4">
          <ClienteEditForm cliente={cliente} />
        </div>

        {/* Columna derecha: stats + historial */}
        <div className="lg:col-span-2 space-y-5">
          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs text-muted-foreground mb-1">Pedidos</p>
              <p className="text-2xl font-bold">{pedidosValidos.length}</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs text-muted-foreground mb-1">Total gastado</p>
              <p className="text-xl font-bold text-green-600">{formatARS(cliente.totalGastado)}</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs text-muted-foreground mb-1">Ticket promedio</p>
              <p className="text-xl font-bold">{formatARS(ticketPromedio)}</p>
            </div>
          </div>

          {/* Historial de pedidos */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="font-semibold text-sm">Historial de compras</h2>
            </div>
            {cliente.pedidos.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <p className="text-sm text-muted-foreground">Sin pedidos registrados</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {cliente.pedidos.map((p) => {
                  const pendiente = p.total - (p.sena ?? 0)
                  const pagado = (p.sena ?? 0) >= p.total && p.total > 0
                  return (
                    <div key={p.id} className="px-5 py-4">
                      <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${ESTADO_COLORS[p.estado as OrderEstado] ?? 'bg-secondary text-secondary-foreground border-border'}`}>
                            {ESTADO_LABELS[p.estado as OrderEstado] ?? p.estado}
                          </span>
                          <span className="text-xs text-muted-foreground">{formatDateTime(p.created_at)}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-sm">{formatARS(p.total)}</span>
                          {pagado && <span className="text-xs text-green-600 font-medium">✓ Pagado</span>}
                          {!pagado && pendiente > 0 && p.sena && (
                            <span className="text-xs text-orange-600 font-medium">Debe {formatARS(pendiente)}</span>
                          )}
                        </div>
                      </div>
                      {/* Ítems del pedido */}
                      <div className="space-y-1">
                        {p.items.map((item, idx) => {
                          const tieneDescuento = item.precio_original != null && item.precio_original > item.precio_unitario
                          const pct = tieneDescuento
                            ? Math.round((1 - item.precio_unitario / item.precio_original!) * 100)
                            : 0
                          return (
                            <div key={idx} className="flex items-center justify-between gap-3">
                              <div className="text-xs text-muted-foreground min-w-0">
                                <span>{item.nombre_producto} × {item.cantidad}</span>
                                <span className="ml-2 text-foreground/70">
                                  {tieneDescuento ? (
                                    <>
                                      <span className="line-through text-muted-foreground/60 mr-1">{formatARS(item.precio_original!)}</span>
                                      <span className="font-medium">{formatARS(item.precio_unitario)}</span>
                                      <span className="ml-1 text-green-600 font-semibold">−{pct}%</span>
                                    </>
                                  ) : (
                                    <span>{formatARS(item.precio_unitario)}</span>
                                  )}
                                  <span className="text-muted-foreground"> c/u</span>
                                </span>
                              </div>
                              <span className="text-xs font-semibold shrink-0">{formatARS(item.precio_unitario * item.cantidad)}</span>
                            </div>
                          )
                        })}
                      </div>
                      {p.nota && <p className="text-xs text-muted-foreground italic mt-1">📝 {p.nota}</p>}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
