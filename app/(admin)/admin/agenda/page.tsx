import { createServiceClient } from '@/lib/supabase/server'
import { formatARS, ESTADO_LABELS, ESTADO_COLORS } from '@/lib/utils'
import FechaEntregaInput from '@/components/admin/FechaEntregaInput'

export const metadata = { title: 'Agenda' }
export const dynamic = 'force-dynamic'

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
  order_items: Array<{ nombre_producto: string; cantidad: number }>
}

async function getAgendaOrders() {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('orders')
    .select('id, cliente_nombre, cliente_telefono, total, sena, estado, fecha_entrega, nota, nota_interna, order_items(nombre_producto, cantidad)')
    .not('estado', 'in', '(cancelada,entregada)')
    .order('fecha_entrega', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true })
  return (data ?? []) as AgendaOrder[]
}

function labelFecha(f: string): { label: string; urgencia: 'pasado' | 'hoy' | 'manana' | 'semana' | 'futuro' } {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
  const d = new Date(f + 'T12:00:00'); d.setHours(0, 0, 0, 0)
  const diff = Math.round((d.getTime() - hoy.getTime()) / 86400000)
  if (diff < 0)  return { label: `Vencido hace ${-diff}d`, urgencia: 'pasado' }
  if (diff === 0) return { label: 'Hoy', urgencia: 'hoy' }
  if (diff === 1) return { label: 'Mañana', urgencia: 'manana' }
  if (diff <= 7)  return { label: 'Esta semana', urgencia: 'semana' }
  return { label: 'Próximamente', urgencia: 'futuro' }
}

const URGENCIA_STYLE = {
  pasado: 'bg-red-50 border-red-300 dark:bg-red-950/30 dark:border-red-800',
  hoy:    'bg-orange-50 border-orange-300 dark:bg-orange-950/30 dark:border-orange-800',
  manana: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950/30 dark:border-yellow-800',
  semana: 'bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800',
  futuro: 'bg-card border-border',
}

const URGENCIA_BADGE = {
  pasado: 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700',
  hoy:    'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700',
  manana: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700',
  semana: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700',
  futuro: 'bg-secondary text-muted-foreground border-border',
}

function OrderCard({ o, urgencia }: { o: AgendaOrder; urgencia: keyof typeof URGENCIA_STYLE }) {
  const pendiente = Math.max(0, Number(o.total) - Number(o.sena ?? 0))
  return (
    <div className={`rounded-xl border p-4 space-y-3 ${URGENCIA_STYLE[urgencia]}`}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border shrink-0 ${ESTADO_COLORS[o.estado as keyof typeof ESTADO_COLORS]}`}>
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
          {pendiente > 0 && <p className="text-xs text-orange-600 font-medium">Debe {formatARS(pendiente)}</p>}
          {pendiente === 0 && Number(o.total) > 0 && <p className="text-xs text-green-600 font-medium">✓ Pagado</p>}
        </div>
      </div>

      {o.order_items?.length > 0 && (
        <div className="space-y-0.5">
          {o.order_items.slice(0, 4).map((item, idx) => (
            <p key={idx} className="text-xs text-muted-foreground">· {item.nombre_producto} ×{item.cantidad}</p>
          ))}
          {o.order_items.length > 4 && (
            <p className="text-xs text-muted-foreground">· y {o.order_items.length - 4} más...</p>
          )}
        </div>
      )}

      {o.nota && <p className="text-xs text-muted-foreground italic">📝 {o.nota}</p>}
      {o.nota_interna && <p className="text-xs text-muted-foreground italic">🔒 {o.nota_interna}</p>}

      <div className="pt-1 border-t border-black/10 dark:border-white/10">
        <FechaEntregaInput orderId={o.id} fechaEntrega={o.fecha_entrega} />
      </div>
    </div>
  )
}

export default async function AgendaPage() {
  const todos = await getAgendaOrders()
  const conFecha = todos.filter((o) => o.fecha_entrega)
  const sinFecha = todos.filter((o) => !o.fecha_entrega)

  // Agrupar por fecha
  const grupos = new Map<string, AgendaOrder[]>()
  for (const o of conFecha) {
    const key = o.fecha_entrega!
    if (!grupos.has(key)) grupos.set(key, [])
    grupos.get(key)!.push(o)
  }
  const fechas = Array.from(grupos.keys()).sort()

  const hoy = new Date().toISOString().split('T')[0]
  const hoyCount = conFecha.filter((o) => o.fecha_entrega === hoy).length
  const vencidoCount = conFecha.filter((o) => o.fecha_entrega! < hoy).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">📅 Agenda de entregas</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {conFecha.length} con fecha programada
          {hoyCount > 0 && ` · ${hoyCount} para hoy`}
          {vencidoCount > 0 && ` · ⚠ ${vencidoCount} vencida${vencidoCount !== 1 ? 's' : ''}`}
          {sinFecha.length > 0 && ` · ${sinFecha.length} sin fecha`}
        </p>
      </div>

      {todos.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground">
          <p className="text-lg">📭</p>
          <p className="font-medium mt-2">No hay pedidos activos</p>
        </div>
      ) : (
        <div className="space-y-7">

          {/* ── Pedidos con fecha ── */}
          {fechas.map((fecha) => {
            const { label, urgencia } = labelFecha(fecha)
            const ordersDelDia = grupos.get(fecha)!
            const totalDia = ordersDelDia.reduce((s, o) => s + Number(o.total), 0)
            const d = new Date(fecha + 'T12:00:00')

            return (
              <section key={fecha}>
                <div className="flex items-center gap-3 mb-3">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${URGENCIA_BADGE[urgencia]}`}>
                    {label}
                  </span>
                  <span className="text-sm font-semibold capitalize">
                    {d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {ordersDelDia.length} pedido{ordersDelDia.length !== 1 ? 's' : ''} · {formatARS(totalDia)}
                  </span>
                </div>
                <div className="space-y-2">
                  {ordersDelDia.map((o) => <OrderCard key={o.id} o={o} urgencia={urgencia} />)}
                </div>
              </section>
            )
          })}

          {/* ── Pedidos sin fecha ── */}
          {sinFecha.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-3">
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border bg-secondary text-muted-foreground border-border">
                  Sin fecha
                </span>
                <span className="text-sm font-semibold text-muted-foreground">Pedidos pendientes sin fecha estimada</span>
                <span className="text-xs text-muted-foreground ml-auto">{sinFecha.length} pedido{sinFecha.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="space-y-2">
                {sinFecha.map((o) => <OrderCard key={o.id} o={o} urgencia="futuro" />)}
              </div>
            </section>
          )}

        </div>
      )}
    </div>
  )
}
