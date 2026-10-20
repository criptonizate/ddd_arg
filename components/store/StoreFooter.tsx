import Link from 'next/link'
import Image from 'next/image'

function InstagramIcon() {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
      <circle cx="12" cy="12" r="4"/>
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none"/>
    </svg>
  )
}

function WhatsAppIcon() {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
      <path d="M11.999 2C6.477 2 2 6.477 2 12c0 1.936.53 3.744 1.452 5.29L2.046 22l4.799-1.396A9.956 9.956 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 11.999 2zm.001 18a7.96 7.96 0 01-4.073-1.117l-.291-.174-3.028.881.86-3.105-.19-.3A7.96 7.96 0 014 12c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8-8 8z"/>
    </svg>
  )
}

const MAP_EMBED = 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3563.680!2d-65.4!3d-24.3!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjTCsDE4JzAwLjAiUyA2NcKwMjQnMDAuMCJX!5e0!3m2!1ses!2sar!4v1'
const MAP_LINK = 'https://maps.app.goo.gl/H4zc7kSGzD4zqmS69'

export default function StoreFooter() {
  return (
    <footer
      className="mt-16 border-t"
      style={{
        backgroundColor: 'oklch(0.17 0.005 264)',
        borderColor: 'oklch(1 0 0 / 8%)',
      }}
    >
      {/* Sección ubicación */}
      <div
        className="border-b"
        style={{ borderColor: 'oklch(1 0 0 / 8%)' }}
      >
        <div className="max-w-6xl mx-auto px-4 py-10">

          {/* Título */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-black" style={{ color: 'oklch(0.88 0.005 264)' }}>📍 Dónde encontrarnos</h3>
            <a
              href={MAP_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors hover:opacity-80 text-xs font-bold"
              style={{
                backgroundColor: 'oklch(0.22 0.005 264)',
                borderColor: 'oklch(1 0 0 / 12%)',
                color: 'oklch(0.85 0.005 264)',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#EA4335"/>
                <circle cx="12" cy="9" r="2.5" fill="#fff"/>
              </svg>
              Ver en Google Maps
            </a>
          </div>

          {/* Foto grande */}
          <div
            className="w-full rounded-2xl overflow-hidden relative"
            style={{ height: 'clamp(220px, 40vw, 420px)' }}
          >
            <Image
              src="/foto-local.jpg"
              alt="Local DDD ARG"
              fill
              className="object-cover object-center"
              sizes="(max-width: 768px) 100vw, 1152px"
            />
            {/* Overlay degradado sutil en la parte inferior */}
            <div
              className="absolute inset-x-0 bottom-0 h-20 pointer-events-none"
              style={{ background: 'linear-gradient(to top, oklch(0.17 0.005 264 / 70%), transparent)' }}
            />
            <p
              className="absolute bottom-4 left-5 text-xs"
              style={{ color: 'oklch(0.65 0.005 264)' }}
            >
              Cap. La Rioja, Argentina
            </p>
          </div>

        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">

          {/* Logo + tagline */}
          <div className="flex flex-col items-center sm:items-start gap-2">
            <Image
              src="/LogoDDDARG.png"
              alt="DDD ARG"
              width={511} height={339}
              className="h-8 w-auto brightness-0 invert opacity-80"
            />
            <p className="text-xs" style={{ color: 'oklch(0.45 0.007 264)' }}>
              Impresión 3D · Argentina
            </p>
          </div>

          {/* Links */}
          <div className="flex items-center gap-6 text-sm">
            <Link
              href="/filamentos"
              className="font-semibold transition-colors hover:text-[#16a34a]"
              style={{ color: 'oklch(0.60 0.005 264)' }}
            >
              🧵 Filamentos
            </Link>
            <Link
              href="/cuenta"
              className="font-semibold transition-colors hover:text-[#16a34a]"
              style={{ color: 'oklch(0.60 0.005 264)' }}
            >
              Mi cuenta
            </Link>
          </div>

          {/* Sociales */}
          <div className="flex items-center gap-3">
            <a
              href="https://wa.me/543804559909"
              target="_blank" rel="noopener noreferrer"
              aria-label="WhatsApp"
              className="p-2 rounded-lg transition-colors text-[#25D366] hover:opacity-70"
            >
              <WhatsAppIcon />
            </a>
            <a
              href="https://instagram.com/DDD_ARG"
              target="_blank" rel="noopener noreferrer"
              aria-label="Instagram"
              className="p-2 rounded-lg transition-colors text-[#E1306C] hover:opacity-70"
            >
              <InstagramIcon />
            </a>
          </div>
        </div>

        <div
          className="mt-8 pt-6 border-t text-center text-xs"
          style={{
            borderColor: 'oklch(1 0 0 / 6%)',
            color: 'oklch(0.38 0.005 264)',
          }}
        >
          © {new Date().getFullYear()} DDD ARG · Todos los derechos reservados
        </div>
      </div>
    </footer>
  )
}
