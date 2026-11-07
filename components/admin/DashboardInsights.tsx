import { formatARS } from '@/lib/utils'
import type { DashboardInsights } from '@/lib/actions/admin-insights'
import { Receipt, Palette, ShoppingBag, Coins } from 'lucide-react'

export default function DashboardInsightsPanel({ insights }: { insights: DashboardInsights }) {
  const { ticketPromedio, pedidosFilamentoCount, carritosAbandonados, kgAbandonadosEnCarritos, topColores, coinsROI } = insights

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-semibold mb-3">📈 Insights del período</h2>
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          <Tile
            icon={<Receipt size={16} className="text-indigo-600" />}
            label="Ticket promedio"
            value={formatARS(ticketPromedio)}
            sub={`${pedidosFilamentoCount} pedido${pedidosFilamentoCount !== 1 ? 's' : ''} de filamento`}
            bg="bg-indigo-50 border-indigo-200 dark:bg-indigo-950/30 dark:border-indigo-800"
          />
          <Tile
            icon={<ShoppingBag size={16} className="text-amber-600" />}
            label="Carritos abandonados"
            value={carritosAbandonados.toString()}
            sub={`${kgAbandonadosEnCarritos.toFixed(1)} kg sin confirmar`}
            bg="bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800"
          />
          <Tile
            icon={<Coins size={16} className="text-yellow-600" />}
            label="DDD Coins regalados"
            value={formatARS(coinsROI.pesosRegalados)}
            sub={`${coinsROI.puntosRegalados.toLocaleString('es-AR')} pts otorgados`}
            bg="bg-yellow-50 border-yellow-200 dark:bg-yellow-950/30 dark:border-yellow-800"
          />
          <Tile
            icon={<Coins size={16} className="text-green-600" />}
            label="Canjeados efectivamente"
            value={formatARS(coinsROI.pesosCanjeados)}
            sub={`${(coinsROI.ratioCanje * 100).toFixed(0)}% de los regalados`}
            bg="bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800"
          />
        </div>
      </div>

      <div>
        <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
          <Palette size={16} />
          Top 5 colores pedidos
        </h2>
        {topColores.length === 0 ? (
          <p className="text-sm text-muted-foreground py-3 bg-secondary/30 rounded-xl text-center">
            Sin pedidos confirmados en el período
          </p>
        ) : (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            {topColores.map((c, i) => (
              <div
                key={`${c.marca}-${c.material}-${c.color}`}
                className={`flex items-center justify-between px-4 py-2.5 ${i > 0 ? 'border-t border-border' : ''}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs font-bold text-muted-foreground w-5 shrink-0">#{i + 1}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{c.color}</p>
                    <p className="text-xs text-muted-foreground truncate">{c.material} · {c.marca}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0 text-right">
                  <span className="text-xs text-muted-foreground">{c.apariciones} pedido{c.apariciones !== 1 ? 's' : ''}</span>
                  <span className="text-sm font-bold tabular-nums">{c.kg.toFixed(1)} kg</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Tile({
  icon,
  label,
  value,
  sub,
  bg,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub: string
  bg: string
}) {
  return (
    <div className={`border rounded-xl p-4 ${bg}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground">{label}</span>
        {icon}
      </div>
      <p className="text-xl font-bold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
    </div>
  )
}
