import { getCalculadoraConfig } from '@/lib/actions/calculadora'
import CalculadoraPublica from '@/components/store/CalculadoraPublica'
import ContactoWhatsapp from '@/components/store/ContactoWhatsapp'

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
  title: 'DDD ARG — Impresión 3D',
  description: 'Impresión 3D en Argentina. Pedidos personalizados, calculadora de precios y contacto directo.',
}

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const config = await getCalculadoraConfig()

  return (
    <div className="space-y-0">

      {/* ── Hero ── */}
      <section className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="inline-flex items-center gap-2 bg-secondary rounded-full px-4 py-1.5 text-xs font-medium text-muted-foreground mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand-orange)]" />
          Impresión 3D en Argentina
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground mb-4">
          Tus ideas
          <br />
          <span className="text-muted-foreground">hechas realidad en 3D</span>
        </h1>
        <p className="text-base text-muted-foreground max-w-md mx-auto">
          Imprimimos lo que imaginás. Diseños personalizados, colores a elección y entrega en todo el país.
        </p>
      </section>

      {/* ── Cómo funciona ── */}
      <section className="bg-secondary/30 border-y border-border py-16">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-center mb-10">¿Cómo funciona?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              {
                step: '01',
                icon: '💬',
                title: 'Me contás tu idea',
                desc: 'Escribime por WhatsApp o Instagram con el diseño que tenés en mente. Si no tenés el archivo, lo conseguimos juntos.',
              },
              {
                step: '02',
                icon: '🎨',
                title: 'Elegís los detalles',
                desc: 'Color de filamento, material, tamaño y acabado. Te mando una cotización con el precio y el tiempo estimado.',
              },
              {
                step: '03',
                icon: '📦',
                title: 'Lo imprimimos y enviamos',
                desc: 'Una vez confirmado el pedido, lo imprimimos y te lo mandamos a todo el país o lo retirás en persona.',
              },
            ].map((item) => (
              <div key={item.step} className="bg-card border border-border rounded-2xl p-6 text-center space-y-3">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-foreground/5 text-2xl mb-1">
                  {item.icon}
                </div>
                <div>
                  <p className="text-xs font-bold text-muted-foreground mb-1">PASO {item.step}</p>
                  <h3 className="font-semibold text-base">{item.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Calculadora ── */}
      <section className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold mb-2">Calculadora de precios</h2>
          <p className="text-sm text-muted-foreground">
            Ingresá los datos de tu pieza para tener una referencia de precio antes de consultar.
          </p>
        </div>
        <CalculadoraPublica config={config} />
      </section>

      {/* ── Contacto WhatsApp ── */}
      <section className="bg-secondary/30 border-y border-border py-16">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">Hacé tu consulta</h2>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Completá el formulario y te mando un mensaje directo por WhatsApp con tu consulta ya redactada.
            </p>
          </div>
          <ContactoWhatsapp />
        </div>
      </section>

      {/* ── Instagram ── */}
      <section className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-bold mb-2">Seguinos en Instagram</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Mirá los últimos trabajos, materiales y novedades en nuestro perfil.
        </p>
        <a
          href="https://instagram.com/DDD_ARG"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 text-white hover:opacity-90 transition-opacity rounded-xl px-6 py-3 text-sm font-semibold shadow-sm"
        >
          <InstagramIcon size={18} />
          @DDD_ARG
        </a>
      </section>

    </div>
  )
}
