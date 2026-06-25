'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useState } from 'react'

function formatMes(mes: string) {
  const [year, month] = mes.split('-')
  return new Intl.DateTimeFormat('es-AR', { month: 'short', year: '2-digit' }).format(
    new Date(Number(year), Number(month) - 1, 1)
  )
}

export default function FiltroMes({
  meses,
  mesActual,
  desdeActual,
  hastaActual,
}: {
  meses: string[]
  mesActual?: string
  desdeActual?: string
  hastaActual?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [showRange, setShowRange] = useState(!!(desdeActual || hastaActual))
  const [desde, setDesde] = useState(desdeActual ?? '')
  const [hasta, setHasta] = useState(hastaActual ?? '')

  function setMes(mes: string | null) {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('desde')
    params.delete('hasta')
    if (mes) params.set('mes', mes)
    else params.delete('mes')
    router.push(`${pathname}?${params.toString()}`)
  }

  function applyRange() {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('mes')
    if (desde) params.set('desde', desde)
    else params.delete('desde')
    if (hasta) params.set('hasta', hasta)
    else params.delete('hasta')
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => { setMes(null); setShowRange(false) }}
          className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
            !mesActual && !desdeActual && !hastaActual && !showRange
              ? 'bg-foreground text-primary-foreground border-foreground'
              : 'border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground'
          }`}
        >
          Todos
        </button>
        {meses.map((mes) => (
          <button
            key={mes}
            onClick={() => { setMes(mes); setShowRange(false) }}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors capitalize ${
              mesActual === mes
                ? 'bg-foreground text-primary-foreground border-foreground'
                : 'border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground'
            }`}
          >
            {formatMes(mes)}
          </button>
        ))}
        <button
          onClick={() => setShowRange((v) => !v)}
          className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
            showRange || desdeActual || hastaActual
              ? 'bg-foreground text-primary-foreground border-foreground'
              : 'border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground'
          }`}
        >
          Rango personalizado
        </button>
      </div>

      {showRange && (
        <div className="flex items-end gap-2 flex-wrap">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Desde</label>
            <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)}
              className="border border-border rounded-lg px-2 py-1.5 text-xs bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Hasta</label>
            <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)}
              className="border border-border rounded-lg px-2 py-1.5 text-xs bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <button
            onClick={applyRange}
            className="px-3 py-1.5 text-xs rounded-lg bg-foreground text-primary-foreground hover:opacity-90 transition-opacity"
          >
            Aplicar
          </button>
        </div>
      )}
    </div>
  )
}
