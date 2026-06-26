import Link from 'next/link'
import { getProducts } from '@/lib/actions/products'
import { formatARS, PRODUCT_ESTADO_LABELS } from '@/lib/utils'
import { Plus, Package, AlertTriangle } from 'lucide-react'

export const metadata = { title: 'Productos' }

export default async function ProductosPage() {
  const products = await getProducts()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Productos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {products.length} producto{products.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          href="/admin/productos/nuevo"
          className="inline-flex items-center gap-2 bg-foreground text-primary-foreground hover:bg-foreground/90 transition-colors rounded-lg px-4 py-2 text-sm font-medium"
        >
          <Plus size={16} />
          Nuevo producto
        </Link>
      </div>

      {products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-card border border-border rounded-xl">
          <Package size={40} className="text-muted-foreground mb-3" />
          <p className="font-medium">Sin productos aún</p>
          <p className="text-sm text-muted-foreground mt-1">
            Creá tu primer producto para empezar
          </p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                    Producto
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">
                    Categoría
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                    Precio base
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">
                    Variantes
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">
                    Stock total
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {products.map((product: any) => {
                  const totalStock = product.product_variants.reduce(
                    (sum: number, v: any) => sum + v.stock,
                    0
                  )
                  const hasLowStock = product.product_variants.some(
                    (v: any) => v.stock <= v.stock_minimo
                  )
                  return (
                    <tr key={product.id} className="hover:bg-secondary/20 transition-colors">
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/productos/${product.id}`}
                          className="font-medium hover:underline"
                        >
                          {product.nombre}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                        {product.categoria || '—'}
                      </td>
                      <td className="px-4 py-3">{formatARS(product.precio_base)}</td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {product.product_variants.length}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="flex items-center gap-1.5">
                          {totalStock}
                          {hasLowStock && (
                            <AlertTriangle
                              size={14}
                              className="text-[var(--brand-orange)]"
                            />
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                            product.estado === 'activo'
                              ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700'
                              : 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600'
                          }`}
                        >
                          {PRODUCT_ESTADO_LABELS[product.estado as 'activo' | 'pausado']}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
