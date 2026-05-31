import { notFound } from 'next/navigation'
import { getProduct } from '@/lib/actions/products'
import ProductForm from '@/components/admin/ProductForm'
import VariantManager from '@/components/admin/VariantManager'
import ImageManager from '@/components/admin/ImageManager'
import DeleteProductButton from '@/components/admin/DeleteProductButton'

export const metadata = { title: 'Editar producto' }

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const product = await getProduct(id).catch(() => null)
  if (!product) notFound()

  return (
    <div className="space-y-8 max-w-3xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{product.nombre}</h1>
          <p className="text-sm text-muted-foreground mt-1">Editar producto</p>
        </div>
        <DeleteProductButton productId={id} />
      </div>

      {/* Formulario base */}
      <section>
        <h2 className="text-base font-semibold mb-4">Datos generales</h2>
        <ProductForm product={product} />
      </section>

      {/* Imágenes */}
      <section>
        <h2 className="text-base font-semibold mb-4">Imágenes</h2>
        <ImageManager productId={id} images={product.product_images} />
      </section>

      {/* Variantes y stock */}
      <section>
        <h2 className="text-base font-semibold mb-4">Variantes y stock</h2>
        <VariantManager productId={id} variants={product.product_variants} />
      </section>
    </div>
  )
}
