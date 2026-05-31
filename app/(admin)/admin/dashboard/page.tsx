import { getDashboardStats } from '@/lib/actions/finance'
import { formatARS } from '@/lib/utils'
import DashboardCharts from '@/components/admin/DashboardCharts'
import StockAlerts from '@/components/admin/StockAlerts'
import { TrendingUp, ShoppingCart, DollarSign, AlertTriangle, Clock, XCircle, Inbox } from 'lucide-react'

export const metadata = { title: 'Dashboard' }

export default async function DashboardPage() {
  const stats = await getDashboardStats()

  const kpis = [
    {
      label: '🛒 Ventas del mes',
      value: stats.ventasMes.toString(),
      sub: 'pedidos confirmados',
      icon: ShoppingCart,
      color: 'text-blue-600',
      bg: 'bg-blue-50 border-blue-200',
    },
    {
      label: '💰 Ingresos del mes',
      value: formatARS(stats.ingresosMes),
      sub: 'cobrado',
      icon: TrendingUp,
      color: 'text-green-600',
      bg: 'bg-green-50 border-green-200',
    },
    {
      label: '💸 Egresos del mes',
      value: formatARS(stats.egresosMes),
      sub: 'gastado',
      icon: DollarSign,
      color: 'text-red-600',
      bg: 'bg-red-50 border-red-200',
    },
    {
      label: '📊 Balance del mes',
      value: formatARS(stats.balanceMes),
      sub: 'ingresos − egresos',
      icon: DollarSign,
      color: stats.balanceMes >= 0 ? 'text-green-600' : 'text-red-600',
      bg: stats.balanceMes >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200',
    },
    {
      label: '⏳ Por cobrar',
      value: formatARS(stats.cobroPendiente),
      sub: 'confirmados sin cobrar',
      icon: Clock,
      color: stats.cobroPendiente > 0 ? 'text-orange-600' : 'text-muted-foreground',
      bg: stats.cobroPendiente > 0 ? 'bg-orange-50 border-orange-200' : 'bg-card border-border',
    },
    {
      label: '📥 Pedidos pendientes',
      value: stats.pedidosPendientes.toString(),
      sub: 'esperando confirmación',
      icon: Inbox,
      color: stats.pedidosPendientes > 0 ? 'text-yellow-600' : 'text-muted-foreground',
      bg: stats.pedidosPendientes > 0 ? 'bg-yellow-50 border-yellow-200' : 'bg-card border-border',
    },
    {
      label: '❌ Cancelaciones',
      value: stats.cancelacionesMes.toString(),
      sub: 'este mes',
      icon: XCircle,
      color: stats.cancelacionesMes > 0 ? 'text-red-500' : 'text-muted-foreground',
      bg: stats.cancelacionesMes > 0 ? 'bg-red-50 border-red-100' : 'bg-card border-border',
    },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">🚀 Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Cómo viene el negocio hoy</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
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
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={16} className="text-orange-600" />
            <span className="text-sm font-semibold text-orange-800">
              ⚠️ Stock bajo — {stats.stockBajo.length} variante{stats.stockBajo.length > 1 ? 's' : ''} casi sin stock
            </span>
          </div>
          <StockAlerts variants={stats.stockBajo} />
        </div>
      )}

      {/* Gráficos */}
      <DashboardCharts
        ventasPorDia={stats.ventasPorDia}
        pedidosPorEstado={stats.pedidosPorEstado}
        topVariantes={stats.topVariantes}
      />
    </div>
  )
}
