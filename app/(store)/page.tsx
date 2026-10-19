import { getFilamentosDisponibles } from '@/lib/actions/filamentos'
import { PRECIO_TIERS } from '@/lib/filamentos-helpers'
import ContactoWhatsapp from '@/components/store/ContactoWhatsapp'
import Link from 'next/link'

export const metadata = {
  title: 'DDD ARG — Impresión 3D',
  description: 'Impresión 3D en Argentina. Filamentos, productos 3D y pedidos personalizados.',
}

export const dynamic = 'force-dynamic'

const WHATSAPP = '543804559909'

function colorToCss(color: string): string {
  const c = color.toLowerCase()
  if (c.includes('black'))                            return '#1a1a1a'
  if (c.includes('white'))                            return '#f0f0f0'
  if (c.includes('grey') || c.includes('gray'))       return '#9ca3af'
  if (c.includes('vermilion') || c.includes('ruby'))  return '#c0392b'
  if (c.includes('berry') || c.includes('red'))       return '#e53e3e'
  if (c.includes('blue'))                             return '#3b82f6'
  if (c.includes('teal'))                             return '#14b8a6'
  if (c.includes('olive'))                            return '#84a830'
  if (c.includes('green'))                            return '#22c55e'
  if (c.includes('yellow') || c.includes('sunshine')) return '#eab308'
  if (c.includes('orange'))                           return '#f97316'
  if (c.includes('taro') || c.includes('purple'))     return '#a855f7'
  if (c.includes('pink'))                             return '#ec4899'
  if (c.includes('brown') || c.includes('madera'))    return '#92400e'
  if (c.includes('silk') || c.includes('gold'))       return '#d97706'
  return '#94a3b8'
}

const MAT_BADGE: Record<string, string> = {
  PLA: '#22c55e', PETG: '#3b82f6', TPU: '#a855f7', ABS: '#f97316', ASA: '#eab308',
}

function InstagramIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" />
    </svg>
  )
}

function WhatsAppIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
      <path d="M11.999 2C6.477 2 2 6.477 2 12c0 1.936.53 3.744 1.452 5.29L2.046 22l4.799-1.396A9.956 9.956 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 11.999 2zm.001 18a7.96 7.96 0 01-4.073-1.117l-.291-.174-3.028.881.86-3.105-.19-.3A7.96 7.96 0 014 12c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8-8 8z" />
    </svg>
  )
}

export default async function HomePage() {
  const filamentos = await getFilamentosDisponibles()

  const materiales = Array.from(new Set(filamentos.map(f => f.material))).sort()
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
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-orange-400 mb-3 sm:mb-4">
                <span className="w-6 h-px bg-orange-400" />
                Impresión 3D · La Rioja, Argentina
              </p>
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black leading-tight tracking-tight mb-4 sm:mb-5">
                Imprimimos
                <br />
                <span className="text-orange-500">lo que imaginás</span>
              </h1>
              <p className="text-sm sm:text-base text-gray-300 max-w-md mx-auto md:mx-0 mb-6 sm:mb-8 leading-relaxed">
                Diseños personalizados, filamentos premium y entrega en todo el país. Pedidos directos sin vueltas.
              </p>
              <div className="flex flex-col xs:flex-row gap-2.5 sm:gap-3 justify-center md:justify-start">
                <Link
                  href="/filamentos"
                  className="inline-flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm rounded-xl px-5 sm:px-6 py-3 sm:py-3.5 transition-colors shadow-lg shadow-orange-500/30"
                >
                  Ver filamentos →
                </Link>
                <a
                  href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent('Hola! Quiero hacer un pedido de impresión 3D.')}`}
                  target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-sm rounded-xl px-5 sm:px-6 py-3 sm:py-3.5 transition-colors"
                >
                  <WhatsAppIcon />
                  Consultar por WhatsApp
                </a>
              </div>
            </div>

            {/* Cartel Precios Mayoristas */}
            <div className="flex-none w-full md:w-auto flex justify-center md:justify-end">
              <div className="relative">
                {/* Fondo con rotación leve */}
                <div className="absolute inset-0 bg-orange-500 rounded-2xl rotate-2 opacity-40" />
                <div className="relative bg-orange-500 border-2 border-orange-400 rounded-2xl px-7 sm:px-10 py-6 sm:py-8 text-center shadow-2xl shadow-orange-500/40">
                  <p className="text-orange-100 text-xs sm:text-sm font-bold uppercase tracking-[0.2em] mb-1">
                    ★ Accedé a
                  </p>
                  <p className="text-white text-3xl sm:text-4xl font-black leading-none uppercase tracking-tight">
                    Precios
                  </p>
                  <p className="text-white text-3xl sm:text-4xl font-black leading-none uppercase tracking-tight">
                    Mayoristas
                  </p>
                  <div className="mt-3 h-px bg-white/30" />
                  <p className="mt-3 text-orange-100 text-xs sm:text-sm leading-snug">
                    Comprando {mejorDescuento?.min}+ kg<br />
                    <span className="font-black text-white text-base sm:text-lg">{fmtARS(mejorPrecio)} / kg</span>
                    <span className="block text-orange-200 text-[10px] sm:text-xs mt-0.5">
                      precio de lista {fmtARS(precioBase)}
                    </span>
                  </p>
                </div>
              </div>
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

      {/* ══════════════════════════════════════════════════
          FILAMENTOS — sección con colores vivos
      ══════════════════════════════════════════════════ */}
      <section className="py-10 sm:py-14 bg-background">
        <div className="max-w-6xl mx-auto px-4">

          <div className="flex items-end justify-between mb-5 sm:mb-8">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-primary mb-1">Stock disponible</p>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-foreground">Filamentos</h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">Precio por kg · Descuentos automáticos por volumen</p>
            </div>
            <Link
              href="/filamentos"
              className="text-xs sm:text-sm font-bold text-primary hover:text-primary/80 transition-colors whitespace-nowrap"
            >
              Ver todos ({totalColores}) →
            </Link>
          </div>

          {/* Materiales disponibles */}
          <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-4 sm:mb-6">
            {materiales.map(mat => (
              <Link
                key={mat}
                href="/filamentos"
                className="flex items-center gap-1.5 text-[11px] sm:text-xs font-bold px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full border border-border bg-card hover:border-primary hover:text-primary transition-colors"
              >
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: MAT_BADGE[mat] ?? '#94a3b8' }} />
                {mat}
                <span className="text-muted-foreground font-normal">({filamentos.filter(f => f.material === mat).length})</span>
              </Link>
            ))}
          </div>

          {/* Grid de colores */}
          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-9 gap-1.5 sm:gap-2">
            {filamentos.slice(0, 18).map((f) => {
              const css = colorToCss(f.color)
              const kg = Math.floor((f.rollos_cerrados * f.peso_rollo_gr + f.gramos_sueltos) / 1000)
              return (
                <Link
                  key={f.id}
                  href="/filamentos"
                  title={`${f.color} — ${f.material} (${kg} kg)`}
                  className="group bg-card border border-border rounded-lg sm:rounded-xl overflow-hidden hover:shadow-md hover:border-primary/40 transition-all"
                >
                  <div
                    className="h-10 sm:h-14 w-full"
                    style={{
                      backgroundColor: css,
                      backgroundImage: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.2) 0%, transparent 60%)',
                    }}
                  />
                  <div className="px-1 py-1 sm:px-1.5 sm:py-1.5 text-center">
                    <p className="text-[8px] sm:text-[9px] font-semibold truncate leading-tight">{f.color}</p>
                    <p className="hidden sm:block text-[8px] text-muted-foreground">{f.material}</p>
                  </div>
                </Link>
              )
            })}
          </div>

          <div className="mt-4 sm:mt-5 text-center">
            <Link
              href="/filamentos"
              className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-white font-bold text-sm rounded-xl px-5 sm:px-6 py-2.5 sm:py-3 transition-colors shadow-sm"
            >
              Ver los {totalColores} colores disponibles →
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          CTA FINAL — fondo naranja, contacto directo
      ══════════════════════════════════════════════════ */}
      <section className="bg-primary">
        <div className="max-w-4xl mx-auto px-4 py-10 sm:py-14 text-center">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-white mb-2 sm:mb-3">
            ¿Tenés una idea? Hablemos.
          </h2>
          <p className="text-white/80 text-sm sm:text-base mb-6 sm:mb-8 max-w-md mx-auto">
            Completá el formulario o escribinos directo por WhatsApp. Respondemos rápido.
          </p>
          <div className="max-w-xl mx-auto">
            <ContactoWhatsapp dark />
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          INSTAGRAM
      ══════════════════════════════════════════════════ */}
      <section className="bg-[#1c1c1c] py-10 text-center">
        <p className="text-gray-400 text-sm mb-4">Seguinos para ver los últimos trabajos</p>
        <a
          href="https://instagram.com/DDD_ARG"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2.5 text-white font-bold text-base hover:text-orange-400 transition-colors"
        >
          <InstagramIcon />
          @DDD_ARG
        </a>
      </section>

    </div>
  )
}
