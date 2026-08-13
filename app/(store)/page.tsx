import { getCalculadoraConfig } from '@/lib/actions/calculadora'
import CalculadoraPublica from '@/components/store/CalculadoraPublica'

function InstagramIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" />
    </svg>
  )
}

export const metadata = {
  title: 'DDD ARG — Calculadora de impresión 3D',
  description: 'Calculá el precio estimado de tu pieza 3D. Ingresá gramos de filamento y horas de impresión.',
}

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const config = await getCalculadoraConfig()

  return (
    <div>
      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 py-16 text-center">
        <div className="inline-flex items-center gap-2 bg-secondary rounded-full px-4 py-1.5 text-xs font-medium text-muted-foreground mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand-orange)]" />
          Impresión 3D en Argentina
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground mb-4">
          Calculadora
          <br />
          <span className="text-muted-foreground">de impresión 3D</span>
        </h1>
        <p className="text-base text-muted-foreground max-w-md mx-auto mb-10">
          Ingresá la cantidad de filamento y las horas de impresión para obtener un precio de referencia.
        </p>

        <CalculadoraPublica config={config} />
      </section>

      {/* CTA */}
      <section className="bg-foreground text-primary-foreground mt-8">
        <div className="max-w-6xl mx-auto px-4 py-14 text-center">
          <h2 className="text-xl font-bold mb-2">¿Querés hacer una pieza?</h2>
          <p className="text-primary-foreground/70 mb-6 max-w-sm mx-auto text-sm">
            Escribinos por Instagram o WhatsApp y hacemos tu idea realidad.
          </p>
          <a
            href="https://instagram.com/DDD_ARG"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-white text-foreground hover:bg-white/90 transition-colors rounded-xl px-6 py-3 text-sm font-medium"
          >
            <InstagramIcon size={16} />
            Contactar por Instagram
          </a>
        </div>
      </section>
    </div>
  )
}
