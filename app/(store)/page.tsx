import { getFilamentosDisponibles } from '@/lib/actions/filamentos'
import { PRECIO_TIERS } from '@/lib/filamentos-helpers'
import Link from 'next/link'
import Image from 'next/image'

const MAP_LINK = 'https://maps.app.goo.gl/H4zc7kSGzD4zqmS69'

export const metadata = {
  title: 'DDD ARG — Impresión 3D',
  description: 'Impresión 3D en Argentina. Filamentos, productos 3D y pedidos personalizados.',
}

export const revalidate = 300

export default async function HomePage() {
  const filamentos = await getFilamentosDisponibles()

  const totalColores = filamentos.length
  const precioBase = PRECIO_TIERS[PRECIO_TIERS.length - 1].precio        // precio sin descuento
  const mejorPrecio = Math.min(...PRECIO_TIERS.map(t => t.precio))       // precio más bajo
  const mejorDescuento = PRECIO_TIERS.find(t => t.precio === mejorPrecio)
  const fmtARS = (n: number) => `$${n.toLocaleString('es-AR')}`

  return (
    <div>

      {/* ══════════════════════════════════════════════════
          HERO — fondo carbón oscuro, headline bold
      ══════════════════════════════════════════════════ */}
      <section className="bg-[#1c1c1c] text-white">
        <div className="max-w-6xl mx-auto px-4 py-10 sm:py-14 md:py-20">
          <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12 lg:gap-16">

            {/* Texto */}
            <div className="flex-1 text-center md:text-left">
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest mb-3 sm:mb-4" style={{ color: '#22c55e' }}>
                <span className="w-6 h-px" style={{ backgroundColor: '#22c55e' }} />
                Impresión 3D · La Rioja, Argentina
              </p>
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black leading-tight tracking-tight mb-4 sm:mb-5">
                Imprimimos
                <br />
                <span style={{ color: '#22c55e' }}>lo que imaginás</span>
              </h1>
              <p className="text-sm sm:text-base text-gray-300 max-w-md mx-auto md:mx-0 mb-6 sm:mb-8 leading-relaxed">
                Diseños personalizados, filamentos premium y entrega en todo el país. Pedidos directos sin vueltas.
              </p>
              <div className="flex flex-col xs:flex-row gap-2.5 sm:gap-3 justify-center md:justify-start">
                <Link
                  href="/filamentos"
                  className="inline-flex items-center justify-center gap-2 text-white font-bold text-sm rounded-xl px-5 sm:px-6 py-3 sm:py-3.5 transition-colors"
                  style={{ backgroundColor: '#15803d', boxShadow: '0 8px 24px #15803d44' }}
                >
                  Ver filamentos →
                </Link>
              </div>
            </div>

            {/* Cartel Precios Mayoristas — clicable, lleva al listado de filamentos */}
            <div className="flex-none w-full md:w-auto flex justify-center md:justify-end">
              <Link
                href="/filamentos"
                aria-label="Ver filamentos y acceder a precios mayoristas"
                className="relative block focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#22c55e] rounded-2xl"
              >
                {/* Fondo con rotación leve */}
                <div className="absolute inset-0 rounded-2xl rotate-2 opacity-40" style={{ backgroundColor: '#166534' }} />
                <div
                  className="relative border-2 rounded-2xl px-7 sm:px-10 py-6 sm:py-8 text-center shadow-2xl transition-transform hover:scale-[1.02]"
                  style={{ backgroundColor: '#166534', borderColor: '#16a34a', boxShadow: '0 20px 60px #16653466' }}
                >
                  <p className="text-xs sm:text-sm font-bold uppercase tracking-[0.2em] mb-1" style={{ color: '#bbf7d0' }}>
                    ★ Accedé a
                  </p>
                  <p className="text-white text-3xl sm:text-4xl font-black leading-none uppercase tracking-tight">
                    Precios
                  </p>
                  <p className="text-white text-3xl sm:text-4xl font-black leading-none uppercase tracking-tight">
                    Mayoristas
                  </p>
                  <div className="mt-3 h-px bg-white/20" />
                  <p className="mt-3 text-xs sm:text-sm leading-snug" style={{ color: '#bbf7d0' }}>
                    Comprando {mejorDescuento?.min}+ kg<br />
                    <span className="font-black text-white text-base sm:text-lg">{fmtARS(mejorPrecio)} / kg</span>
                    <span className="block text-[10px] sm:text-xs mt-0.5" style={{ color: '#86efac' }}>
                      precio de lista {fmtARS(precioBase)}
                    </span>
                  </p>
                  <p className="mt-3 text-[11px] font-semibold text-white/90">Ver filamentos →</p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          TRUST BAR — íconos + texto en una línea
      ══════════════════════════════════════════════════ */}
      <section className="bg-card border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-3 sm:py-4">
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {[
              { icon: '🚚', title: 'Envío a todo el país', sub: 'Correo y moto' },
              { icon: '📍', title: 'Retiro en local', sub: 'Cap. La Rioja' },
              { icon: '💬', title: 'Atención directa', sub: 'Por WhatsApp' },
              { icon: '🎨', title: `+${totalColores} colores`, sub: 'PLA · PETG · TPU' },
            ].map((item) => (
              <div key={item.title} className="flex items-center gap-2 sm:gap-3">
                <span className="text-xl sm:text-2xl shrink-0">{item.icon}</span>
                <div className="min-w-0">
                  <p className="font-semibold text-foreground text-[11px] sm:text-xs leading-tight truncate">{item.title}</p>
                  <p className="text-muted-foreground text-[10px] sm:text-xs">{item.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sección "Stock disponible" ocultada por pedido: el home queda más
          limpio. Los filamentos se ven completos en /filamentos. */}

      {/* ══════════════════════════════════════════════════
          CÓMO COMPRÁS — 3 pasos simples
      ══════════════════════════════════════════════════ */}
      <section className="bg-card border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-8 sm:py-12">
          <h2 className="text-base font-black text-center mb-6 sm:mb-8" style={{ color: 'oklch(0.88 0.005 264)' }}>
            ¿Cómo comprás?
          </h2>
          <div className="grid grid-cols-3 gap-4 sm:gap-8 max-w-xl mx-auto">
            {[
              { num: '1', title: 'Elegí tu filamento', sub: 'Filtrá por color, material o marca' },
              { num: '2', title: 'Registrá tu pedido', sub: 'Necesitás una cuenta de Google' },
              { num: '3', title: 'Coordinamos por WhatsApp', sub: 'Envío a todo el país o retiro en local' },
            ].map((step) => (
              <div key={step.num} className="flex flex-col items-center text-center gap-2">
                <span
                  className="w-9 h-9 rounded-full flex items-center justify-center text-base font-black shrink-0"
                  style={{ backgroundColor: 'oklch(0.55 0.18 145 / 20%)', color: '#4ade80', border: '1.5px solid oklch(0.55 0.18 145 / 30%)' }}
                >
                  {step.num}
                </span>
                <p className="text-xs font-bold text-foreground leading-tight">{step.title}</p>
                <p className="text-[10px] text-muted-foreground leading-snug">{step.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          UBICACIÓN — solo en home
      ══════════════════════════════════════════════════ */}
      <section style={{ backgroundColor: 'oklch(0.17 0.005 264)', borderTop: '1px solid oklch(1 0 0 / 8%)' }}>
        <div className="max-w-6xl mx-auto px-4 py-10 sm:py-14">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-black" style={{ color: 'oklch(0.88 0.005 264)' }}>📍 Dónde encontrarnos</h3>
            <a
              href={MAP_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors hover:opacity-80 text-xs font-bold"
              style={{ backgroundColor: 'oklch(0.22 0.005 264)', borderColor: 'oklch(1 0 0 / 12%)', color: 'oklch(0.85 0.005 264)' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#EA4335"/>
                <circle cx="12" cy="9" r="2.5" fill="#fff"/>
              </svg>
              Ver en Google Maps
            </a>
          </div>
          <div className="w-full rounded-2xl overflow-hidden relative" style={{ height: 'clamp(220px, 40vw, 420px)' }}>
            <Image
              src="/foto-local.jpg"
              alt="Local DDD ARG"
              fill
              className="object-cover object-center"
              sizes="(max-width: 768px) 100vw, 1152px"
            />
            <div className="absolute inset-x-0 bottom-0 h-20 pointer-events-none" style={{ background: 'linear-gradient(to top, oklch(0.17 0.005 264 / 70%), transparent)' }} />
            <p className="absolute bottom-4 left-5 text-xs" style={{ color: 'oklch(0.65 0.005 264)' }}>Cap. La Rioja, Argentina</p>
          </div>
        </div>
      </section>

      {/* Bloque "¿Tenés una idea? Hablemos." quitado por pedido — el CTA de
          WhatsApp sigue disponible en el header y en el footer. */}

    </div>
  )
}
