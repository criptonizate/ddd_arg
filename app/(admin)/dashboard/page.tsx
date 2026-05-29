import { getDashboardStats } from '@/lib/actions/finance'
import { formatARS } from '@/lib/utils'
import DashboardCharts from '@/components/admin/DashboardCharts'
import StockAlerts from '@/components/admin/StockAlerts'
import {
  TrendingUp,
  ShoppingCart,
  DollarSign,
  AlertTriangle,
} from 'lucide-react'

export const metadata = { title: 'Dashboard' }

export default async function DashboardPage() {
  const stats = await getDashboardStats()

  const kpis = [
    {
      label: 'Ventas del mes',
      value: stats.ventasMes.toString(),
      sub: 'pedidos confirmados',
      icon: ShoppingCart,
      color: 'text-blue-600',
    },
    {
      label: 'Ingresos del mes',
      value: formatARS(stats.ingresosMes),
      sub: 'cobrado',
      icon: TrendingUp,
      color: 'text-green-600',
    },
    {
      label: 'Egresos del mes',
      value: formatARS(stats.egresosMes),
      sub: 'gastado',
      icon: DollarSign,
      color: 'text-red-600',
    },
    {
      label: 'Balance del mes',
      value: formatARS(stats.balanceMes),
      sub: 'ingresos − egresos',
      icon: DollarSign,
      color: stats.balanceMes >= 0 ? 'text-green-600' : 'text-red-600',
    },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Resumen del negocio</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon
          return (
            <div
              key={kpi.label}
              className="bg-card border border-border rounded-xl p-5 shadow-sm"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground">{kpi.label}</span>
                <Icon size={18} className={kpi.color} />
              </div>
              <p className="text-2xl font-bold">{kpi.value}</p>
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
              Stock bajo ({stats.stockBajo.length} variante{stats.stockBajo.length > 1 ? 's' : ''})
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
