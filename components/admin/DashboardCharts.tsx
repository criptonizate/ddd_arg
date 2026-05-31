'use client'

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { formatARS, formatDate, ESTADO_LABELS } from '@/lib/utils'
import type { OrderEstado } from '@/lib/supabase/types'

const COLORS = ['#EA580C', '#18181B', '#71717A', '#E7E5E4', '#A8A29E']

interface Props {
  ventasPorDia: { fecha: string; total: number; cantidad: number }[]
  pedidosPorEstado: { estado: OrderEstado; count: number }[]
  topVariantes: {
    nombre_variante: string
    producto: string
    vendidos: number
    ingresos: number
  }[]
}

export default function DashboardCharts({
  ventasPorDia,
  pedidosPorEstado,
  topVariantes,
}: Props) {
  const pieData = pedidosPorEstado.map((p) => ({
    name: ESTADO_LABELS[p.estado],
    value: p.count,
  }))

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Ventas por día */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-sm lg:col-span-2">
        <h3 className="font-semibold mb-4">Ingresos últimos 30 días</h3>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={ventasPorDia}>
            <defs>
              <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#EA580C" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#EA580C" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E7E5E4" />
            <XAxis
              dataKey="fecha"
              tick={{ fontSize: 11 }}
              tickFormatter={(v) =>
                new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit' }).format(
                  new Date(v)
                )
              }
            />
            <YAxis
              tick={{ fontSize: 11 }}
              tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              formatter={(value: any) => [formatARS(Number(value)), 'Ingresos']}
              labelFormatter={(l) => formatDate(l)}
            />
            <Area
              type="monotone"
              dataKey="total"
              stroke="#EA580C"
              strokeWidth={2}
              fill="url(#gradTotal)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Pedidos por estado */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
        <h3 className="font-semibold mb-4">Pedidos por estado</h3>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={3}
              dataKey="value"
            >
              {pieData.map((_, idx) => (
                <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(v: any) => [`${v} pedidos`]} />
            <Legend
              iconType="circle"
              iconSize={8}
              formatter={(v) => <span className="text-xs">{v}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Top variantes */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
        <h3 className="font-semibold mb-4">Top variantes vendidas</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart
            data={topVariantes.slice(0, 6)}
            layout="vertical"
            margin={{ left: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#E7E5E4" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11 }} />
            <YAxis
              type="category"
              dataKey="nombre_variante"
              tick={{ fontSize: 10 }}
              width={100}
            />
            <Tooltip formatter={(v: any) => [`${v} unidades`, 'Vendidas']} />
            <Bar dataKey="vendidos" fill="#EA580C" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
