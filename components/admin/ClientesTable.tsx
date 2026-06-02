'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { formatARS, formatDate } from '@/lib/utils'
import { Star, Search, X } from 'lucide-react'
import type { ClienteStats } from '@/lib/actions/clientes'

export default function ClientesTable({ clientes }: { clientes: ClienteStats[] }) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return clientes
    return clientes.filter(
      (c) =>
        c.nombre.toLowerCase().includes(q) ||
        c.telefono?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q)
    )
  }, [clientes, search])

  return (
    <div className="space-y-3">
      {/* Buscador */}
      <div className="relative max-w-xs">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar cliente..."
          className="w-full pl-9 pr-8 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X size={12} />
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="py-10 text-center text-sm text-muted-foreground">
          {search ? `Sin resultados para "${search}"` : 'Sin clientes todavía'}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="text-left px-5 py-3 font-medium">Cliente</th>
                  <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Teléfono</th>
                  <th className="text-right px-4 py-3 font-medium">Pedidos</th>
                  <th className="text-right px-4 py-3 font-medium">Total pagado</th>
                  <th className="text-right px-4 py-3 font-medium">Pendiente</th>
                  <th className="text-right px-4 py-3 font-medium hidden md:table-cell">Última compra</th>
                  <th className="px-4 py-3 w-10" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, idx) => (
                  <tr
                    key={c.id}
                    className="border-b border-border/50 last:border-0 hover:bg-secondary/20 transition-colors"
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        {idx === 0 && !search && c.totalPedidos > 0 && (
                          <Star size={12} className="text-yellow-500 shrink-0" />
                        )}
                        <Link href={`/admin/clientes/${c.id}`} className="font-medium hover:underline">
                          {c.nombre}
                        </Link>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                      {c.telefono ? (
                        <a href={`tel:${c.telefono}`} className="hover:text-foreground hover:underline">
                          {c.telefono}
                        </a>
                      ) : (
                        <span className="text-xs italic opacity-50">sin teléfono</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {c.totalPedidos > 0 ? (
                        <span className="font-medium">{c.totalPedidos}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {c.totalPagado > 0 ? (
                        <span className="font-semibold text-green-600">{formatARS(c.totalPagado)}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {c.totalPendiente > 0 ? (
                        <span className="font-semibold text-orange-600">{formatARS(c.totalPendiente)}</span>
                      ) : c.totalPedidos > 0 ? (
                        <span className="text-xs text-green-600 font-medium">✓ Al día</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground text-xs hidden md:table-cell">
                      {c.ultimaCompra ? formatDate(c.ultimaCompra) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/clientes/${c.id}`}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Ver →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {search && (
            <p className="text-xs text-muted-foreground text-center py-2 border-t border-border">
              {filtered.length} resultado{filtered.length !== 1 ? 's' : ''} de {clientes.length}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
