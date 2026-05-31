import { getBalance } from '@/lib/actions/finance'
import { formatARS, formatDate, EGRESO_CATEGORIA_LABELS } from '@/lib/utils'
import EgresoForm from '@/components/admin/EgresoForm'
import ExportCSVButton from '@/components/admin/ExportCSVButton'
import DeleteTransactionButton from '@/components/admin/DeleteTransactionButton'
import type { Transaction } from '@/lib/supabase/types'

export const metadata = { title: 'Finanzas' }

export default async function FinanzasPage({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string; hasta?: string }>
}) {
  const { desde, hasta } = await searchParams
  const { ingresos, egresos, balance, transactions } = await getBalance(desde, hasta)

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Finanzas</h1>
          <p className="text-sm text-muted-foreground mt-1">Ingresos, egresos y balance</p>
        </div>
        <ExportCSVButton transactions={transactions} />
      </div>

      {/* Filtro de fechas */}
      <form method="GET" className="flex items-end gap-3 flex-wrap">
        <div>
          <label className="text-xs font-medium mb-1 block">Desde</label>
          <input
            type="date"
            name="desde"
            defaultValue={desde}
            className="border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div>
          <label className="text-xs font-medium mb-1 block">Hasta</label>
          <input
            type="date"
            name="hasta"
            defaultValue={hasta}
            className="border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 rounded-lg text-sm font-medium bg-foreground text-primary-foreground hover:bg-foreground/90 transition-colors"
        >
          Filtrar
        </button>
        {(desde || hasta) && (
          <a
            href="/admin/finanzas"
            className="px-4 py-2 rounded-lg text-sm font-medium border border-border hover:bg-secondary transition-colors"
          >
            Limpiar
          </a>
        )}
      </form>

      {/* KPIs de balance */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Ingresos', value: ingresos, color: 'text-green-600' },
          { label: 'Egresos', value: egresos, color: 'text-red-600' },
          {
            label: 'Balance',
            value: balance,
            color: balance >= 0 ? 'text-green-600' : 'text-red-600',
          },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <p className="text-sm text-muted-foreground">{kpi.label}</p>
            <p className={`text-2xl font-bold mt-1 ${kpi.color}`}>{formatARS(kpi.value)}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Formulario egreso */}
        <div className="lg:col-span-1">
          <h2 className="text-base font-semibold mb-4">Registrar egreso</h2>
          <EgresoForm />
        </div>

        {/* Listado de transacciones */}
        <div className="lg:col-span-2">
          <h2 className="text-base font-semibold mb-4">
            Movimientos ({transactions.length})
          </h2>
          {transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Sin movimientos en el período
            </p>
          ) : (
            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-secondary/30">
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Fecha</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tipo</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">
                        Categoría
                      </th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">
                        Descripción
                      </th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Monto</th>
                      <th className="px-2 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {transactions.map((tx: Transaction) => (
                      <tr key={tx.id} className="hover:bg-secondary/20">
                        <td className="px-4 py-3 text-muted-foreground">
                          {formatDate(tx.fecha)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                              tx.tipo === 'ingreso'
                                ? 'bg-green-50 text-green-700 border-green-200'
                                : 'bg-red-50 text-red-700 border-red-200'
                            }`}
                          >
                            {tx.tipo === 'ingreso' ? '↑' : '↓'} {tx.tipo}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                          {EGRESO_CATEGORIA_LABELS[tx.categoria as keyof typeof EGRESO_CATEGORIA_LABELS] ??
                            tx.categoria}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground hidden md:table-cell max-w-xs truncate">
                          {tx.descripcion ?? '—'}
                        </td>
                        <td
                          className={`px-4 py-3 text-right font-semibold ${
                            tx.tipo === 'ingreso' ? 'text-green-700' : 'text-red-700'
                          }`}
                        >
                          {tx.tipo === 'ingreso' ? '+' : '-'}{formatARS(tx.monto)}
                        </td>
                        <td className="px-2 py-3">
                          <DeleteTransactionButton id={tx.id} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
