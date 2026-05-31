import Link from 'next/link'
import Image from 'next/image'
import { getActiveProducts } from '@/lib/actions/products'
import { formatARS } from '@/lib/utils'
import { ArrowRight } from 'lucide-react'

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
  description: 'Productos únicos impresos en 3D. Diseños originales, calidad premium. Argentina.',
}

export default async function HomePage() {
  const products = await getActiveProducts()
  const featured = (products as any[]).filter((p) => {
    const totalStock = p.product_variants.reduce((s: number, v: any) => s + v.stock, 0)
    return totalStock > 0
  }).slice(0, 4)

  return (
    <div>
      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 py-20 text-center">
        <div className="inline-flex items-center gap-2 bg-secondary rounded-full px-4 py-1.5 text-xs font-medium text-muted-foreground mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand-orange)]" />
          Impresión 3D en Argentina
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground mb-6">
          Objetos únicos
          <br />
          <span className="text-muted-foreground">impresos en 3D</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8">
          Diseños originales, colores a elección y calidad premium. Cada pieza impresa
          especialmente para vos.
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Link
            href="/catalogo"
            className="inline-flex items-center gap-2 bg-foreground text-primary-foreground hover:bg-foreground/90 transition-colors rounded-xl px-6 py-3 text-sm font-medium"
          >
            Ver catálogo
            <ArrowRight size={16} />
          </Link>
          <a
            href="https://instagram.com/DDD_ARG"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 border border-border hover:bg-secondary transition-colors rounded-xl px-6 py-3 text-sm font-medium"
          >
            <InstagramIcon size={16} />
            @DDD_ARG
          </a>
        </div>
      </section>

      {/* Productos destacados */}
      {featured.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 pb-20">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-semibold">Productos disponibles</h2>
            <Link
              href="/catalogo"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              Ver todos
              <ArrowRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {featured.map((product) => {
              const imagen = product.product_images?.[0]?.url
              const totalStock = product.product_variants.reduce((s: number, v: any) => s + v.stock, 0)
              const agotado = totalStock === 0
              return (
                <Link
                  key={product.id}
                  href={`/producto/${product.id}`}
                  className="group bg-card border border-border rounded-xl overflow-hidden hover:border-foreground/30 hover:shadow-md transition-all"
                >
                  <div className="aspect-square bg-secondary relative overflow-hidden">
                    {imagen ? (
                      <Image
                        src={imagen}
                        alt={product.nombre}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-3xl text-muted-foreground/30 font-bold">3D</span>
                      </div>
                    )}
                    {agotado && (
                      <span className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded-full">
                        Agotado
                      </span>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="font-medium text-sm truncate">{product.nombre}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{product.categoria}</p>
                    <p className="font-semibold text-sm mt-1">{formatARS(product.precio_base)}</p>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="bg-foreground text-primary-foreground">
        <div className="max-w-6xl mx-auto px-4 py-16 text-center">
          <h2 className="text-2xl font-bold mb-3">¿Tenés un diseño en mente?</h2>
          <p className="text-primary-foreground/70 mb-6 max-w-md mx-auto">
            Escribinos por Instagram o WhatsApp y hacemos tu idea realidad.
          </p>
          <a
            href="https://instagram.com/DDD_ARG"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-white text-foreground hover:bg-white/90 transition-colors rounded-xl px-6 py-3 text-sm font-medium"
          >
            <InstagramIcon size={16} />
            Contactar
          </a>
        </div>
      </section>
    </div>
  )
}
