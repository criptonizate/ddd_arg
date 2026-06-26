import { createServiceClient } from '@/lib/supabase/server'
import { formatARS, ESTADO_LABELS, ESTADO_COLORS } from '@/lib/utils'
import Link from 'next/link'

export const metadata = { title: 'Agenda' }

interface AgendaOrder {
  id: string
  cliente_nombre: string
  cliente_telefono: string | null
  total: number
  sena: number | null
  estado: string
  fecha_entrega: string | null
  nota: string | null
  nota_interna: string | null
  order_items: Array<{ nombre_producto: string; cantidad: number; precio_unitario: number }>
}

async function getOrdersConFechaEntrega(): Promise<AgendaOrder[]> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('orders')
    .select('id, cliente_nombre, cliente_telefono, total, sena, estado, fecha_entrega, nota, nota_interna, order_items(nombre_producto, cantidad, precio_unitario)')
    .not('fecha_entrega', 'is', null)
    .not('estado', 'in', '(cancelada,entregada)')
    .order('fecha_entrega', { ascending: true })
  return (data ?? []) as AgendaOrder[]
}

function parseFecha(f: string) {
  return new Date(f + 'T12:00:00')
}

function labelFecha(f: string): { label: string; urgencia: 'pasado' | 'hoy' | 'manana' | 'semana' | 'futuro' } {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
  const manana = new Date(hoy); manana.setDate(hoy.getDate() + 1)
  const en7 = new Date(hoy); en7.setDate(hoy.getDate() + 7)
  const d = parseFecha(f); d.setHours(0, 0, 0, 0)

  if (d < hoy) return { label: 'Vencido', urgencia: 'pasado' }
  if (d.getTime() === hoy.getTime()) return { label: 'Hoy', urgencia: 'hoy' }
  if (d.getTime() === manana.getTime()) return { label: 'Mañana', urgencia: 'manana' }
  if (d <= en7) return { label: 'Esta semana', urgencia: 'semana' }
  return { label: 'Próximamente', urgencia: 'futuro' }
}

const URGENCIA_STYLE = {
  pasado: 'bg-red-50 border-red-300 dark:bg-red-950/30 dark:border-red-800',
  hoy: 'bg-orange-50 border-orange-300 dark:bg-orange-950/30 dark:border-orange-800',
  manana: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950/30 dark:border-yellow-800',
  semana: 'bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800',
  futuro: 'bg-card border-border',
}

const URGENCIA_BADGE = {
  pasado: 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700',
  hoy: 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700',
  manana: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700',
  semana: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700',
  futuro: 'bg-secondary text-muted-foreground border-border',
}

export default async function AgendaPage() {
  const orders = await getOrdersConFechaEntrega()

  const grupos: Record<string, typeof orders> = {}
  for (const o of orders) {
    const key = o.fecha_entrega!
    if (!grupos[key]) grupos[key] = []
    grupos[key].push(o)
  }
  const fechas = Object.keys(grupos).sort()

  const hoy = new Date().toISOString().split('T')[0]
  const hoyCount = orders.filter((o) => o.fecha_entrega === hoy).length
  const vencidoCount = orders.filter((o) => o.fecha_entrega! < hoy).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">📅 Agenda de entregas</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {orders.length} entrega{orders.length !== 1 ? 's' : ''} programada{orders.length !== 1 ? 's' : ''}
          {hoyCount > 0 && ` · ${hoyCount} para hoy`}
          {vencidoCount > 0 && ` · ${vencidoCount} vencida${vencidoCount !== 1 ? 's' : ''}`}
        </p>
      </div>

      {orders.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground">
          <p className="text-lg">📭</p>
          <p className="font-medium mt-2">Sin entregas programadas</p>
          <p className="text-sm mt-1">Asigná una fecha de entrega a los pedidos desde la pantalla de Ventas</p>
        </div>
      ) : (
        <div className="space-y-6">
          {fechas.map((fecha) => {
            const { label, urgencia } = labelFecha(fecha)
            const ordersDelDia = grupos[fecha]
            const totalDia = ordersDelDia.reduce((s, o) => s + Number(o.total), 0)

            return (
              <div key={fecha}>
                <div className="flex items-center gap-3 mb-3">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${URGENCIA_BADGE[urgencia]}`}>
                    {label}
                  </span>
                  <span className="text-sm font-semibold">
                    {parseFecha(fecha).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </span>
                  <span className="text-xs text-muted-foreground ml-auto">{ordersDelDia.length} entrega{ordersDelDia.length !== 1 ? 's' : ''} · {formatARS(totalDia)}</span>
                </div>

                <div className="space-y-2">
                  {ordersDelDia.map((o: any) => {
                    const pendiente = Math.max(0, Number(o.total) - Number(o.sena ?? 0))
                    return (
                      <div key={o.id} className={`rounded-xl border p-4 ${URGENCIA_STYLE[urgencia]}`}>
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${ESTADO_COLORS[o.estado as keyof typeof ESTADO_COLORS]}`}>
                              {ESTADO_LABELS[o.estado as keyof typeof ESTADO_LABELS]}
                            </span>
                            <span className="font-semibold text-sm">{o.cliente_nombre}</span>
                            {o.cliente_telefono && (
                              <a href={`tel:${o.cliente_telefono}`} className="text-xs text-muted-foreground hover:underline">
                                {o.cliente_telefono}
                              </a>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-bold text-sm">{formatARS(o.total)}</p>
                            {pendiente > 0 && (
                              <p className="text-xs text-orange-600 font-medium">Debe {formatARS(pendiente)}</p>
                            )}
                            {pendiente === 0 && Number(o.total) > 0 && (
                              <p className="text-xs text-green-600 font-medium">✓ Pagado</p>
                            )}
                          </div>
                        </div>

                        {o.order_items?.length > 0 && (
                          <div className="mt-2 space-y-0.5">
                            {o.order_items.slice(0, 4).map((item: any, idx: number) => (
                              <p key={idx} className="text-xs text-muted-foreground">
                                · {item.nombre_producto} ×{item.cantidad}
                              </p>
                            ))}
                            {o.order_items.length > 4 && (
                              <p className="text-xs text-muted-foreground">· y {o.order_items.length - 4} más...</p>
                            )}
                          </div>
                        )}

                        {o.nota && <p className="text-xs text-muted-foreground mt-1 italic">📝 {o.nota}</p>}
                        {o.nota_interna && <p className="text-xs text-muted-foreground mt-0.5 italic">🔒 {o.nota_interna}</p>}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
