import ProductForm from '@/components/admin/ProductForm'

export const metadata = { title: 'Nuevo producto' }

export default function NuevoProductoPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Nuevo producto</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Completá los datos para crear un producto
        </p>
      </div>
      <ProductForm />
    </div>
  )
}
