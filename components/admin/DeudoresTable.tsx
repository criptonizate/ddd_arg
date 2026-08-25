'use client'

import type { DeudorConAntiguedad } from '@/lib/actions/finance'
import { formatARS } from '@/lib/utils'

function Badge({ dias }: { dias: number }) {
  if (dias > 30) return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700">🔴 +{dias}d</span>
  if (dias > 7) return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700 border border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700">🟡 {dias}d</span>
  return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700">🟢 {dias}d</span>
}

export default function DeudoresTable({ deudores }: { deudores: DeudorConAntiguedad[] }) {
  if (deudores.length === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center dark:bg-green-950/20 dark:border-green-800">
        <p className="text-2xl mb-1">✅</p>
        <p className="text-sm text-green-800 dark:text-green-300 font-medium">Sin deudas pendientes</p>
      </div>
    )
  }

  const totalPendiente = deudores.reduce((s, d) => s + d.pendiente, 0)

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 text-sm">
        <span className="text-muted-foreground">{deudores.length} cliente{deudores.length !== 1 ? 's' : ''} deben</span>
        <span className="font-bold text-orange-600">{formatARS(totalPendiente)}</span>
        <span className="text-xs text-muted-foreground ml-auto">🔴 +30d · 🟡 8–30d · 🟢 0–7d</span>
      </div>
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Cliente</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Estado</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Total</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Seña</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Debe</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Antigüedad</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {deudores.map((d) => (
                <tr key={d.id} className="hover:bg-secondary/20">
                  <td className="px-4 py-3">
                    <div className="font-medium">{d.cliente_nombre}</div>
                    {d.cliente_telefono && (
                      <a
                        href={`https://wa.me/54${d.cliente_telefono.replace(/\D/g, '')}?text=Hola%20${encodeURIComponent(d.cliente_nombre)}%2C%20te%20recuerdo%20que%20tenes%20un%20saldo%20pendiente%20de%20${formatARS(d.pendiente)}.`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-green-600 hover:underline"
                      >
                        📲 {d.cliente_telefono}
                      </a>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="text-xs text-muted-foreground capitalize">{d.estado}</span>
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{formatARS(d.total)}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{d.sena > 0 ? formatARS(d.sena) : '—'}</td>
                  <td className="px-4 py-3 text-right font-bold text-orange-600">{formatARS(d.pendiente)}</td>
                  <td className="px-4 py-3"><Badge dias={d.dias} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
