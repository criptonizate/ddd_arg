import { getActiveProducts } from '@/lib/actions/products'
import ProductCard from '@/components/store/ProductCard'

export const metadata = { title: 'Catálogo — DDD ARG' }
export const dynamic = 'force-dynamic'

export default async function CatalogoPage() {
  const products = await getActiveProducts()

  const categorias = Array.from(
    new Set(products.map((p: { categoria?: string | null }) => p.categoria).filter(Boolean))
  ) as string[]

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="mb-10">
        <h1 className="text-3xl font-bold mb-2">Catálogo</h1>
        <p className="text-muted-foreground">
          Todos nuestros productos disponibles. Precios en pesos argentinos.
        </p>
      </div>

      {products.length === 0 ? (
        <div className="text-center py-24 text-muted-foreground">
          <p className="text-5xl mb-4">📦</p>
          <p className="text-lg font-medium">Próximamente</p>
          <p className="text-sm mt-1">Estamos cargando el catálogo.</p>
        </div>
      ) : (
        <>
          {categorias.length > 0 ? (
            categorias.map((cat) => (
              <section key={cat} className="mb-14">
                <h2 className="text-lg font-semibold mb-5 pb-2 border-b border-border">{cat}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                  {products
                    .filter((p) => p.categoria === cat)
                    .map((p) => (
                      <ProductCard key={p.id} product={p} />
                    ))}
                </div>
              </section>
            ))
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
