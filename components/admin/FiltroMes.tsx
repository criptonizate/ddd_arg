'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'

function formatMes(mes: string) {
  const [year, month] = mes.split('-')
  return new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric' }).format(
    new Date(Number(year), Number(month) - 1, 1)
  )
}

export default function FiltroMes({
  meses,
  mesActual,
}: {
  meses: string[]
  mesActual?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function setMes(mes: string | null) {
    const params = new URLSearchParams(searchParams.toString())
    if (mes) params.set('mes', mes)
    else params.delete('mes')
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-muted-foreground">Filtrar por mes:</span>
      <button
        onClick={() => setMes(null)}
        className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
          !mesActual
            ? 'bg-foreground text-primary-foreground border-foreground'
            : 'border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground'
        }`}
      >
        Todos
      </button>
      {meses.map((mes) => (
        <button
          key={mes}
          onClick={() => setMes(mes)}
          className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors capitalize ${
            mesActual === mes
              ? 'bg-foreground text-primary-foreground border-foreground'
              : 'border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground'
          }`}
        >
          {formatMes(mes)}
        </button>
      ))}
    </div>
  )
}
