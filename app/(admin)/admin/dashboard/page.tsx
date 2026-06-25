import { getDashboardStats } from '@/lib/actions/finance'
import { formatARS } from '@/lib/utils'
import DashboardCharts from '@/components/admin/DashboardCharts'
import StockAlerts from '@/components/admin/StockAlerts'
import { TrendingUp, ShoppingCart, Users, DollarSign, AlertTriangle, Clock, Inbox } from 'lucide-react'

export const metadata = { title: 'Dashboard' }

const PERIODOS = [
  { label: 'Esta semana', value: 'semana' },
  { label: 'Este mes', value: 'mes' },
  { label: 'Mes anterior', value: 'mes-anterior' },
  { label: 'Personalizado', value: 'custom' },
]

function getPeriodo(p: string | undefined, desde: string | undefined, hasta: string | undefined) {
  const now = new Date()
  if (p === 'semana') {
    const lun = new Date(now)
    lun.setDate(now.getDate() - ((now.getDay() + 6) % 7))
    return { desde: lun.toISOString().split('T')[0], hasta: now.toISOString().split('T')[0] }
  }
  if (p === 'mes-anterior') {
    const first = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const last = new Date(now.getFullYear(), now.getMonth(), 0)
    return { desde: first.toISOString().split('T')[0], hasta: last.toISOString().split('T')[0] }
  }
  if (p === 'custom' && (desde || hasta)) {
    return { desde, hasta }
  }
  // default: mes actual
  return {
    desde: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
    hasta: now.toISOString().split('T')[0],
  }
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string; desde?: string; hasta?: string }>
}) {
  const { periodo, desde, hasta } = await searchParams
  const range = getPeriodo(periodo, desde, hasta)
  const stats = await getDashboardStats({ desde: range.desde, hasta: range.hasta })
  const activePeriodo = periodo ?? 'mes'

  const kpis = [
    {
      label: '💰 Ingresos del período',
      value: formatARS(stats.ingresosMes),
      sub: 'ventas cobradas',
      icon: TrendingUp,
      color: 'text-green-600',
      bg: 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800',
    },
    {
      label: '🛒 Pedidos del período',
      value: stats.ventasMes.toString(),
      sub: stats.montoHoy > 0 ? `Hoy: ${formatARS(stats.montoHoy)}` : `Hoy: sin ventas`,
      icon: ShoppingCart,
      color: 'text-blue-600',
      bg: 'bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800',
    },
    {
      label: '👥 Clientes nuevos',
      value: stats.clientesNuevosMes.toString(),
      sub: 'registrados en el período',
      icon: Users,
      color: 'text-purple-600',
      bg: 'bg-purple-50 border-purple-200 dark:bg-purple-950/30 dark:border-purple-800',
    },
    {
      label: '📊 Balance del período',
      value: formatARS(stats.balanceMes),
      sub: 'ingresos − egresos',
      icon: DollarSign,
      color: stats.balanceMes >= 0 ? 'text-green-600' : 'text-red-600',
      bg: stats.balanceMes >= 0 ? 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800' : 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800',
    },
    {
      label: '⏳ Por cobrar',
      value: formatARS(stats.cobroPendiente),
      sub: 'confirmados sin cobrar',
      icon: Clock,
      color: stats.cobroPendiente > 0 ? 'text-orange-600' : 'text-muted-foreground',
      bg: stats.cobroPendiente > 0 ? 'bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-800' : 'bg-card border-border',
    },
    {
      label: '📥 Pedidos pendientes',
      value: stats.pedidosPendientes.toString(),
      sub: 'esperando confirmación',
      icon: Inbox,
      color: stats.pedidosPendientes > 0 ? 'text-yellow-600' : 'text-muted-foreground',
      bg: stats.pedidosPendientes > 0 ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950/30 dark:border-yellow-800' : 'bg-card border-border',
    },
  ]

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">🚀 Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Cómo viene el negocio</p>
        </div>

        {/* Filtro período */}
        <form method="GET" className="flex items-center gap-2 flex-wrap">
          {PERIODOS.map((p) => (
            <button
              key={p.value}
              type="submit"
              name="periodo"
              value={p.value}
              className={`px-3 py-1.5 text-xs rounded-full border transition-colors font-medium ${
                activePeriodo === p.value
                  ? 'bg-foreground text-primary-foreground border-foreground'
                  : 'border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground'
              }`}
            >
              {p.label}
            </button>
          ))}
          {activePeriodo === 'custom' && (
            <div className="flex items-center gap-2">
              <input type="date" name="desde" defaultValue={desde} className="border border-border rounded-lg px-2 py-1 text-xs bg-background" />
              <span className="text-xs text-muted-foreground">→</span>
              <input type="date" name="hasta" defaultValue={hasta} className="border border-border rounded-lg px-2 py-1 text-xs bg-background" />
              <input type="hidden" name="periodo" value="custom" />
              <button type="submit" className="px-3 py-1 text-xs rounded-lg bg-foreground text-primary-foreground">OK</button>
            </div>
          )}
        </form>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon
          return (
            <div key={kpi.label} className={`border rounded-xl p-5 shadow-sm ${kpi.bg}`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground">{kpi.label}</span>
                <Icon size={18} className={kpi.color} />
              </div>
              <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{kpi.sub}</p>
            </div>
          )
        })}
      </div>

      {/* Alertas de stock bajo */}
      {stats.stockBajo.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 dark:bg-orange-950/30 dark:border-orange-800">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={16} className="text-orange-600" />
            <span className="text-sm font-semibold text-orange-800 dark:text-orange-400">
              ⚠️ Stock bajo — {stats.stockBajo.length} variante{stats.stockBajo.length > 1 ? 's' : ''} casi sin stock
            </span>
          </div>
          <StockAlerts variants={stats.stockBajo} />
        </div>
      )}

      {/* Gráfico ingresos */}
      <DashboardCharts ventasPorDia={stats.ventasPorDia} />
    </div>
  )
}
