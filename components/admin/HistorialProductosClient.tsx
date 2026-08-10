'use client'

import { useState, useMemo } from 'react'
import { formatARS, formatDate } from '@/lib/utils'
import { Search, ChevronDown, ChevronUp, X } from 'lucide-react'
import type { VentaProducto } from '@/lib/actions/products'

export default function HistorialProductosClient({ ventas }: { ventas: VentaProducto[] }) {
  const [search, setSearch] = useState('')
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set())

  function toggleProduct(nombre: string) {
    setExpandedProducts((prev) => {
      const next = new Set(prev)
      next.has(nombre) ? next.delete(nombre) : next.add(nombre)
      return next
    })
  }

  // Agrupar por nombre_producto
  const grupos = useMemo(() => {
    const map = new Map<string, VentaProducto[]>()
    for (const v of ventas) {
      const key = v.nombre_producto
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(v)
    }
    // Convertir a array, ordenar cada grupo por fecha desc
    return Array.from(map.entries())
      .map(([nombre, items]) => {
        const sorted = [...items].sort((a, b) => b.created_at.localeCompare(a.created_at))
        const ultimoPrecio = sorted[0].precio_unitario
        const ultimaVenta = sorted[0].created_at
        const totalUnidades = items.reduce((s, i) => s + i.cantidad, 0)
        const totalFacturado = items.reduce((s, i) => s + i.cantidad * i.precio_unitario, 0)
        return { nombre, items: sorted, ultimoPrecio, ultimaVenta, totalUnidades, totalFacturado }
      })
      .sort((a, b) => b.ultimaVenta.localeCompare(a.ultimaVenta)) // más reciente primero
  }, [ventas])

  const filtered = useMemo(() => {
    if (!search.trim()) return grupos
    const q = search.toLowerCase()
    return grupos.filter((g) => g.nombre.toLowerCase().includes(q))
  }, [grupos, search])

  return (
    <div className="space-y-4">
      {/* Buscador */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar producto..."
          className="w-full pl-9 pr-9 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          autoFocus
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X size={13} />
          </button>
        )}
      </div>

      {/* Resumen */}
      <p className="text-xs text-muted-foreground">
        {filtered.length} producto{filtered.length !== 1 ? 's' : ''} vendido{filtered.length !== 1 ? 's' : ''}
        {search && ` que coinciden con "${search}"`}
      </p>

      {filtered.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground bg-card border border-border rounded-xl">
          <p className="font-medium">Sin resultados</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((g) => {
            const isOpen = expandedProducts.has(g.nombre)
            return (
              <div key={g.nombre} className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                {/* Header colapsable */}
                <button
                  onClick={() => toggleProduct(g.nombre)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/30 transition-colors text-left"
                >
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-sm truncate block">{g.nombre}</span>
                    <span className="text-xs text-muted-foreground">
                      Última venta: {formatDate(g.ultimaVenta)}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 shrink-0 text-right">
                    <div className="hidden sm:block">
                      <p className="text-xs text-muted-foreground">Último precio</p>
                      <p className="text-sm font-bold">{formatARS(g.ultimoPrecio)}</p>
                    </div>
                    <div className="hidden md:block">
                      <p className="text-xs text-muted-foreground">Uds. vendidas</p>
                      <p className="text-sm font-semibold">{g.totalUnidades}</p>
                    </div>
                    <div className="hidden md:block">
                      <p className="text-xs text-muted-foreground">Facturado</p>
                      <p className="text-sm font-semibold">{formatARS(g.totalFacturado)}</p>
                    </div>
                    <span className="text-xs bg-secondary text-muted-foreground rounded-full px-2 py-0.5 font-medium">
                      {g.items.length} venta{g.items.length !== 1 ? 's' : ''}
                    </span>
                    {isOpen ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
                  </div>
                </button>

                {/* Detalle expandido */}
                {isOpen && (
                  <div className="border-t border-border overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-secondary/30 border-b border-border">
                          <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Fecha</th>
                          <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Cliente</th>
                          <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground hidden sm:table-cell">Variante</th>
                          <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Cant.</th>
                          <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Precio unit.</th>
                          <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {g.items.map((v, idx) => (
                          <tr key={idx} className="hover:bg-secondary/20 transition-colors">
                            <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                              {formatDate(v.created_at)}
                            </td>
                            <td className="px-4 py-2.5 text-sm font-medium">{v.cliente_nombre}</td>
                            <td className="px-4 py-2.5 text-xs text-muted-foreground hidden sm:table-cell">
                              {v.nombre_variante ?? '—'}
                            </td>
                            <td className="px-4 py-2.5 text-right text-sm">{v.cantidad}</td>
                            <td className="px-4 py-2.5 text-right text-sm font-semibold">{formatARS(v.precio_unitario)}</td>
                            <td className="px-4 py-2.5 text-right text-sm font-bold">{formatARS(v.precio_unitario * v.cantidad)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-secondary/20 border-t border-border font-semibold">
                          <td colSpan={3} className="px-4 py-2.5 text-xs text-muted-foreground">Total</td>
                          <td className="px-4 py-2.5 text-right text-sm">{g.totalUnidades}</td>
                          <td className="px-4 py-2.5" />
                          <td className="px-4 py-2.5 text-right text-sm">{formatARS(g.totalFacturado)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
