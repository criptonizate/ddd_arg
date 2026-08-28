import Link from 'next/link'
import { getProducts, getHistorialVentasProductos } from '@/lib/actions/products'
import { getCategorias } from '@/lib/actions/categorias'
import { Plus, Package } from 'lucide-react'
import HistorialProductosClient from '@/components/admin/HistorialProductosClient'
import ProductosTablaClient from '@/components/admin/ProductosTablaClient'
import CategoriasManager from '@/components/admin/CategoriasManager'

export const metadata = { title: 'Productos' }
export const dynamic = 'force-dynamic'

type PageProps = { searchParams: Promise<{ tab?: string }> }

export default async function ProductosPage({ searchParams }: PageProps) {
  const { tab = 'catalogo' } = await searchParams
  const [products, ventas, categorias] = await Promise.all([
    getProducts(),
    getHistorialVentasProductos(),
    getCategorias(),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Productos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {products.length} producto{products.length !== 1 ? 's' : ''} en catálogo
          </p>
        </div>
        {tab === 'catalogo' && (
          <Link
            href="/admin/productos/nuevo"
            className="inline-flex items-center gap-2 bg-foreground text-primary-foreground hover:bg-foreground/90 transition-colors rounded-lg px-4 py-2 text-sm font-medium"
          >
            <Plus size={16} />
            Nuevo producto
          </Link>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        <Link
          href="/admin/productos?tab=catalogo"
          className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
            tab === 'catalogo'
              ? 'bg-foreground text-primary-foreground border-foreground'
              : 'border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground'
          }`}
        >
          📦 Catálogo
        </Link>
        <Link
          href="/admin/productos?tab=historial"
          className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
            tab === 'historial'
              ? 'bg-foreground text-primary-foreground border-foreground'
              : 'border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground'
          }`}
        >
          📊 Historial de ventas
          {ventas.length > 0 && (
            <span className={`ml-2 text-xs font-bold ${tab === 'historial' ? 'opacity-70' : 'text-muted-foreground'}`}>
              {new Set(ventas.map((v) => v.nombre_producto)).size}
            </span>
          )}
        </Link>
        <Link
          href="/admin/productos?tab=categorias"
          className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
            tab === 'categorias'
              ? 'bg-foreground text-primary-foreground border-foreground'
              : 'border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground'
          }`}
        >
          🏷️ Categorías
          <span className={`ml-2 text-xs font-bold ${tab === 'categorias' ? 'opacity-70' : 'text-muted-foreground'}`}>
            {categorias.length}
          </span>
        </Link>
      </div>

      {/* ── Tab: Catálogo ── */}
      {tab === 'catalogo' && (
        products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center bg-card border border-border rounded-xl">
            <Package size={40} className="text-muted-foreground mb-3" />
            <p className="font-medium">Sin productos aún</p>
            <p className="text-sm text-muted-foreground mt-1">
              Creá tu primer producto para empezar
            </p>
          </div>
        ) : (
          <ProductosTablaClient products={products as any} />
        )
      )}

      {/* ── Tab: Historial de ventas ── */}
      {tab === 'historial' && (
        ventas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center bg-card border border-border rounded-xl">
            <Package size={40} className="text-muted-foreground mb-3" />
            <p className="font-medium">Sin ventas registradas aún</p>
          </div>
        ) : (
          <HistorialProductosClient ventas={ventas} />
        )
      )}

      {/* ── Tab: Categorías ── */}
      {tab === 'categorias' && (
        <CategoriasManager categorias={categorias} />
      )}
    </div>
  )
}
