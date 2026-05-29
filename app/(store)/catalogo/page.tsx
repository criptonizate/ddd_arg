import Link from 'next/link'
import Image from 'next/image'
import { getActiveProducts } from '@/lib/actions/products'
import { formatARS } from '@/lib/utils'

export const metadata = { title: 'Catálogo' }

export default async function CatalogoPage({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string; q?: string }>
}) {
  const { categoria, q } = await searchParams
  const allProducts = await getActiveProducts()

  // Filtrar por categoría y búsqueda
  let filtered = allProducts
  if (categoria) {
    filtered = filtered.filter(
      (p) => p.categoria?.toLowerCase() === categoria.toLowerCase()
    )
  }
  if (q) {
    const query = q.toLowerCase()
    filtered = filtered.filter(
      (p) =>
        p.nombre.toLowerCase().includes(query) ||
        p.descripcion?.toLowerCase().includes(query)
    )
  }

  // Categorías únicas
  const categorias = Array.from(
    new Set(allProducts.map((p) => p.categoria).filter(Boolean) as string[])
  ).sort()

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-6">Catálogo</h1>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <form className="flex gap-2 flex-1">
          <input
            name="q"
            defaultValue={q}
            placeholder="Buscar productos..."
            className="flex-1 border border-input rounded-xl px-4 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {categoria && <input type="hidden" name="categoria" value={categoria} />}
          <button
            type="submit"
            className="px-4 py-2 rounded-xl text-sm font-medium bg-foreground text-primary-foreground hover:bg-foreground/90 transition-colors"
          >
            Buscar
          </button>
        </form>
      </div>

      {/* Filtro por categorías */}
      {categorias.length > 0 && (
        <div className="flex gap-2 flex-wrap mb-8">
          <a
            href="/catalogo"
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              !categoria
                ? 'bg-foreground text-primary-foreground border-foreground'
                : 'border-border hover:border-foreground/40'
            }`}
          >
            Todos
          </a>
          {categorias.map((cat) => (
            <a
              key={cat}
              href={`/catalogo?categoria=${encodeURIComponent(cat)}${q ? `&q=${q}` : ''}`}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                categoria === cat
                  ? 'bg-foreground text-primary-foreground border-foreground'
                  : 'border-border hover:border-foreground/40'
              }`}
            >
              {cat}
            </a>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground">No encontramos productos con esa búsqueda.</p>
          <a href="/catalogo" className="text-sm underline mt-2 block">
            Limpiar filtros
          </a>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground mb-4">
            {filtered.length} producto{filtered.length !== 1 ? 's' : ''}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map((product) => {
              const imagen = product.product_images?.[0]?.url
              const totalStock = product.product_variants.reduce((s, v) => s + v.stock, 0)
              const agotado = totalStock === 0
              const esNuevo =
                new Date(product.created_at) >
                new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)

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
                    <div className="absolute top-2 left-2 flex gap-1 flex-wrap">
                      {esNuevo && (
                        <span className="bg-[var(--brand-orange)] text-white text-xs px-2 py-0.5 rounded-full font-medium">
                          Nuevo
                        </span>
                      )}
                      {agotado && (
                        <span className="bg-black/70 text-white text-xs px-2 py-0.5 rounded-full">
                          Agotado
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="p-3">
                    <p className="font-medium text-sm truncate">{product.nombre}</p>
                    {product.categoria && (
                      <p className="text-xs text-muted-foreground mt-0.5">{product.categoria}</p>
                    )}
                    <p className="font-semibold text-sm mt-1">{formatARS(product.precio_base)}</p>
                  </div>
                </Link>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
