'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { formatARS } from '@/lib/utils'

interface Props {
  chartData: { fecha: string; ingreso: number; egreso: number }[]
}

export default function FinanzasChart({ chartData }: Props) {
  if (chartData.length === 0) return null

  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
      <h3 className="font-semibold mb-4 text-sm">Ingresos vs Egresos por día</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData} barGap={2} barCategoryGap="30%">
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.1)" />
          <XAxis
            dataKey="fecha"
            tick={{ fontSize: 10 }}
            tickFormatter={(v) =>
              new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit' }).format(new Date(v))
            }
          />
          <YAxis
            tick={{ fontSize: 10 }}
            tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
          />
          <Tooltip
            formatter={(value: any, name: string | undefined) => [
              formatARS(Number(value)),
              name === 'ingreso' ? 'Ingresos' : 'Egresos',
            ]}
            labelFormatter={(l) =>
              new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(l))
            }
          />
          <Legend formatter={(v) => (v === 'ingreso' ? 'Ingresos' : 'Egresos')} />
          <Bar dataKey="ingreso" fill="#4ade80" radius={[3, 3, 0, 0]} />
          <Bar dataKey="egreso" fill="#f87171" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
