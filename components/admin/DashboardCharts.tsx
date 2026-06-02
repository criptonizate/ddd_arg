'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { formatARS, formatDate } from '@/lib/utils'

const CHART_BLUE = '#60A5FA'
const CHART_GREEN = '#34D399'
const GRID_COLOR = 'rgba(128,128,128,0.1)'

interface Props {
  ventasPorDia: { fecha: string; total: number; cantidad: number }[]
}

export default function DashboardCharts({ ventasPorDia }: Props) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Ingresos por día */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-sm lg:col-span-2">
        <h3 className="font-semibold mb-4">Ingresos últimos 30 días</h3>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={ventasPorDia}>
            <defs>
              <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={CHART_BLUE} stopOpacity={0.25} />
                <stop offset="95%" stopColor={CHART_BLUE} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradCantidad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={CHART_GREEN} stopOpacity={0.2} />
                <stop offset="95%" stopColor={CHART_GREEN} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
            <XAxis
              dataKey="fecha"
              tick={{ fontSize: 11 }}
              tickFormatter={(v) =>
                new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit' }).format(new Date(v))
              }
            />
            <YAxis
              yAxisId="monto"
              tick={{ fontSize: 11 }}
              tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
            />
            <YAxis
              yAxisId="cant"
              orientation="right"
              tick={{ fontSize: 11 }}
              allowDecimals={false}
            />
            <Tooltip
              formatter={(value: any, name: string | undefined) =>
                name === 'total'
                  ? [formatARS(Number(value)), 'Ingresos']
                  : [`${value} pedido${value !== 1 ? 's' : ''}`, 'Cantidad']
              }
              labelFormatter={(l) => formatDate(l)}
            />
            <Area
              yAxisId="monto"
              type="monotone"
              dataKey="total"
              stroke={CHART_BLUE}
              strokeWidth={2}
              fill="url(#gradTotal)"
            />
            <Area
              yAxisId="cant"
              type="monotone"
              dataKey="cantidad"
              stroke={CHART_GREEN}
              strokeWidth={1.5}
              fill="url(#gradCantidad)"
              strokeDasharray="4 2"
            />
          </AreaChart>
        </ResponsiveContainer>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Azul: ingresos · Verde punteado: cantidad de pedidos
        </p>
      </div>
    </div>
  )
}
