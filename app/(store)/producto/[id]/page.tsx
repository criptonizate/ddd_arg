import { notFound } from 'next/navigation'
import { getProduct } from '@/lib/actions/products'
import { formatARS } from '@/lib/utils'
import AddToCartSection from '@/components/store/AddToCartSection'
import ProductGallery from '@/components/store/ProductGallery'
import type { Metadata } from 'next'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const product = await getProduct(id).catch(() => null)
  if (!product) return { title: 'Producto no encontrado' }

  return {
    title: product.nombre,
    description: product.descripcion ?? `${product.nombre} — DDD ARG`,
    openGraph: {
      title: `${product.nombre} — DDD ARG`,
      description: product.descripcion ?? '',
      images: product.product_images[0]?.url
        ? [{ url: product.product_images[0].url }]
        : [],
    },
  }
}

export default async function ProductoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const product = await getProduct(id).catch(() => null)
  if (!product || product.estado !== 'activo') notFound()

  const totalStock = product.product_variants.reduce((s: number, v: any) => s + v.stock, 0)

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* Galería */}
        <ProductGallery images={product.product_images} productName={product.nombre} />

        {/* Info */}
        <div>
          {product.categoria && (
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
              {product.categoria}
            </p>
          )}
          <h1 className="text-2xl font-bold mb-2">{product.nombre}</h1>
          <p className="text-2xl font-bold text-foreground mb-4">
            {formatARS(product.precio_base)}
          </p>

          {product.descripcion && (
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              {product.descripcion}
            </p>
          )}

          {totalStock === 0 ? (
            <div className="border border-border rounded-xl p-4 text-center">
              <p className="font-medium">Producto agotado</p>
              <p className="text-sm text-muted-foreground mt-1">
                Seguinos en{' '}
                <a
                  href="https://instagram.com/DDD_ARG"
                  className="underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  @DDD_ARG
                </a>{' '}
                para novedades
              </p>
            </div>
          ) : (
            <AddToCartSection product={product} />
          )}
        </div>
      </div>
    </div>
  )
}
