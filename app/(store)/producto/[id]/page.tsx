import { notFound } from 'next/navigation'
import Image from 'next/image'
import { getProduct } from '@/lib/actions/products'
import { formatARS } from '@/lib/utils'
import AddToCartSection from '@/components/store/AddToCartSection'
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

  const totalStock = product.product_variants.reduce((s, v) => s + v.stock, 0)

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* Galería */}
        <div className="space-y-3">
          {product.product_images.length > 0 ? (
            <>
              <div className="aspect-square rounded-2xl overflow-hidden bg-secondary relative">
                <Image
                  src={product.product_images[0].url}
                  alt={product.nombre}
                  fill
                  className="object-cover"
                  priority
                />
              </div>
              {product.product_images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto">
                  {product.product_images.map((img, idx) => (
                    <div
                      key={img.id}
                      className="w-16 h-16 rounded-xl overflow-hidden bg-secondary shrink-0 relative border border-border"
                    >
                      <Image
                        src={img.url}
                        alt={`${product.nombre} ${idx + 1}`}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="aspect-square rounded-2xl bg-secondary flex items-center justify-center">
              <span className="text-6xl text-muted-foreground/30 font-bold">3D</span>
            </div>
          )}
        </div>

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
