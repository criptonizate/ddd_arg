import Link from 'next/link'
import { getClientes } from '@/lib/actions/clientes'
import { formatARS, formatDate } from '@/lib/utils'
import NuevoClienteButton from '@/components/admin/NuevoClienteButton'
import { Users, TrendingUp, Star } from 'lucide-react'

export const metadata = { title: 'Clientes' }

export default async function ClientesPage() {
  const clientes = await getClientes()

  const totalGastado = clientes.reduce((s, c) => s + c.totalGastado, 0)
  const conCompras = clientes.filter((c) => c.totalPedidos > 0)
  const top = clientes[0]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">👥 Clientes</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {clientes.length} cliente{clientes.length !== 1 ? 's' : ''} registrado{clientes.length !== 1 ? 's' : ''}
          </p>
        </div>
        <NuevoClienteButton />
      </div>

      {/* Stats resumen */}
      {clientes.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Users size={14} className="text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Total clientes</p>
            </div>
            <p className="text-2xl font-bold">{clientes.length}</p>
            <p className="text-xs text-muted-foreground mt-1">{conCompras.length} con compras</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={14} className="text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Facturado total</p>
            </div>
            <p className="text-2xl font-bold text-green-600">{formatARS(totalGastado)}</p>
            <p className="text-xs text-muted-foreground mt-1">en todos los pedidos</p>
          </div>
          {top && top.totalPedidos > 0 && (
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <Star size={14} className="text-yellow-500" />
                <p className="text-xs text-muted-foreground">Mejor cliente</p>
              </div>
              <p className="text-lg font-bold truncate">{top.nombre}</p>
              <p className="text-xs text-muted-foreground mt-1">{formatARS(top.totalGastado)} · {top.totalPedidos} pedidos</p>
            </div>
          )}
        </div>
      )}

      {/* Tabla de clientes */}
      {clientes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-card border border-border rounded-xl">
          <Users size={40} className="text-muted-foreground mb-3" />
          <p className="font-medium">Sin clientes todavía</p>
          <p className="text-sm text-muted-foreground mt-1">Los clientes se crean automáticamente al registrar un pedido</p>
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
                  <th className="text-right px-4 py-3 font-medium">Total gastado</th>
                  <th className="text-right px-4 py-3 font-medium hidden md:table-cell">Última compra</th>
                  <th className="px-4 py-3 w-10" />
                </tr>
              </thead>
              <tbody>
                {clientes.map((c, idx) => (
                  <tr key={c.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/20 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        {idx === 0 && c.totalPedidos > 0 && <Star size={12} className="text-yellow-500 shrink-0" />}
                        <Link href={`/admin/clientes/${c.id}`} className="font-medium hover:underline">
                          {c.nombre}
                        </Link>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                      {c.telefono ? (
                        <a href={`tel:${c.telefono}`} className="hover:text-foreground hover:underline">{c.telefono}</a>
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
                      {c.totalGastado > 0 ? (
                        <span className="font-semibold text-green-600">{formatARS(c.totalGastado)}</span>
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
        </div>
      )}
    </div>
  )
}
