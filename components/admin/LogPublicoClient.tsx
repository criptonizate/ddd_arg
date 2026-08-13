'use client'

import { useMemo } from 'react'
import { formatARS, formatDateTime } from '@/lib/utils'
import type { LogPublicoEntry } from '@/lib/actions/calculadora'

export default function LogPublicoClient({ entries }: { entries: LogPublicoEntry[] }) {
  const totales = useMemo(() => ({
    consultas: entries.length,
    promedioGramos: entries.length ? entries.reduce((s, e) => s + e.gramos, 0) / entries.length : 0,
    promedioHoras: entries.length ? entries.reduce((s, e) => s + e.horas, 0) / entries.length : 0,
  }), [entries])

  if (entries.length === 0) {
    return (
      <div className="py-16 text-center bg-card border border-border rounded-xl text-muted-foreground">
        <p className="text-2xl mb-2">📊</p>
        <p className="font-medium">Nadie usó la calculadora pública todavía</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Resumen */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold">{totales.consultas}</p>
          <p className="text-xs text-muted-foreground mt-1">Consultas totales</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold">{Math.round(totales.promedioGramos)}g</p>
          <p className="text-xs text-muted-foreground mt-1">Prom. filamento</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold">{totales.promedioHoras.toFixed(1)}h</p>
          <p className="text-xs text-muted-foreground mt-1">Prom. horas</p>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Fecha y hora</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Gramos</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Horas</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Costo base</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Precio ×3</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Precio ×4</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {entries.map((e) => (
                <tr key={e.id} className="hover:bg-secondary/20 transition-colors">
                  <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                    {formatDateTime(e.created_at)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-medium">{e.gramos}g</td>
                  <td className="px-4 py-2.5 text-right font-medium">{e.horas}h</td>
                  <td className="px-4 py-2.5 text-right text-muted-foreground">{formatARS(e.costo_base)}</td>
                  <td className="px-4 py-2.5 text-right font-semibold">{formatARS(e.precio_x3)}</td>
                  <td className="px-4 py-2.5 text-right font-bold text-foreground">{formatARS(e.precio_x4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
