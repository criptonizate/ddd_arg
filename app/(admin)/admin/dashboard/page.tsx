import { getDashboardStats } from '@/lib/actions/finance'
import { formatARS } from '@/lib/utils'
import DashboardCharts from '@/components/admin/DashboardCharts'
import StockAlerts from '@/components/admin/StockAlerts'
import { TrendingUp, ShoppingCart, Users, DollarSign, AlertTriangle, Clock, Inbox } from 'lucide-react'

export const metadata = { title: 'Dashboard' }

export default async function DashboardPage() {
  const stats = await getDashboardStats()

  const kpis = [
    {
      label: '💰 Ingresos del mes',
      value: formatARS(stats.ingresosMes),
      sub: 'ventas cobradas',
      icon: TrendingUp,
      color: 'text-green-600',
      bg: 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800',
    },
    {
      label: '🛒 Pedidos del mes',
      value: stats.ventasMes.toString(),
      sub: stats.montoHoy > 0 ? `Hoy: ${formatARS(stats.montoHoy)}` : `Hoy: sin ventas`,
      icon: ShoppingCart,
      color: 'text-blue-600',
      bg: 'bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800',
    },
    {
      label: '👥 Clientes nuevos',
      value: stats.clientesNuevosMes.toString(),
      sub: 'registrados este mes',
      icon: Users,
      color: 'text-purple-600',
      bg: 'bg-purple-50 border-purple-200 dark:bg-purple-950/30 dark:border-purple-800',
    },
    {
      label: '📊 Balance del mes',
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
      <div>
        <h1 className="text-2xl font-bold">🚀 Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Cómo viene el negocio hoy</p>
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
