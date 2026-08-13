import { getCalculadoraConfig, getCalculoHistorial, getLogCalculadoraPublica } from '@/lib/actions/calculadora'
import CalculadoraClient from '@/components/admin/CalculadoraClient'
import LogPublicoClient from '@/components/admin/LogPublicoClient'

export const metadata = { title: 'Calculadora' }
export const dynamic = 'force-dynamic'

type PageProps = { searchParams: Promise<{ tab?: string }> }

export default async function CalculadoraPage({ searchParams }: PageProps) {
  const { tab = 'calculadora' } = await searchParams
  const [config, historial, logPublico] = await Promise.all([
    getCalculadoraConfig(),
    getCalculoHistorial(),
    getLogCalculadoraPublica(),
  ])

  return (
    <div className="space-y-5">
      {/* Tabs */}
      <div className="flex gap-2">
        <a
          href="/admin/calculadora?tab=calculadora"
          className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
            tab === 'calculadora'
              ? 'bg-foreground text-primary-foreground border-foreground'
              : 'border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground'
          }`}
        >
          🧮 Calculadora
        </a>
        <a
          href="/admin/calculadora?tab=log"
          className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
            tab === 'log'
              ? 'bg-foreground text-primary-foreground border-foreground'
              : 'border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground'
          }`}
        >
          📊 Log público
          {logPublico.length > 0 && (
            <span className={`ml-2 text-xs font-bold ${tab === 'log' ? 'opacity-70' : 'text-muted-foreground'}`}>
              {logPublico.length}
            </span>
          )}
        </a>
      </div>

      {tab === 'calculadora' && (
        <CalculadoraClient initialConfig={config} initialHistorial={historial} />
      )}

      {tab === 'log' && (
        <LogPublicoClient entries={logPublico} />
      )}
    </div>
  )
}
