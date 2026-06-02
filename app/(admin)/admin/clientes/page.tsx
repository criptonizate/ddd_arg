import { getClientes } from '@/lib/actions/clientes'
import { formatARS } from '@/lib/utils'
import NuevoClienteButton from '@/components/admin/NuevoClienteButton'
import ClientesTable from '@/components/admin/ClientesTable'
import { Users, TrendingUp, Clock, Star } from 'lucide-react'

export const metadata = { title: 'Clientes' }

export default async function ClientesPage() {
  const clientes = await getClientes()

  const totalPagado = clientes.reduce((s, c) => s + c.totalPagado, 0)
  const totalPendiente = clientes.reduce((s, c) => s + c.totalPendiente, 0)
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
              <TrendingUp size={14} className="text-green-600" />
              <p className="text-xs text-muted-foreground">Total pagado</p>
            </div>
            <p className="text-2xl font-bold text-green-600">{formatARS(totalPagado)}</p>
            <p className="text-xs text-muted-foreground mt-1">cobrado en total</p>
          </div>
          <div className={`border rounded-xl p-4 ${totalPendiente > 0 ? 'bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-800' : 'bg-card border-border'}`}>
            <div className="flex items-center gap-2 mb-1">
              <Clock size={14} className={totalPendiente > 0 ? 'text-orange-600' : 'text-muted-foreground'} />
              <p className="text-xs text-muted-foreground">Total pendiente</p>
            </div>
            <p className={`text-2xl font-bold ${totalPendiente > 0 ? 'text-orange-600' : 'text-muted-foreground'}`}>
              {formatARS(totalPendiente)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">por cobrar</p>
          </div>
          {top && top.totalPedidos > 0 && (
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <Star size={14} className="text-yellow-500" />
                <p className="text-xs text-muted-foreground">Mejor cliente</p>
              </div>
              <p className="text-base font-bold truncate">{top.nombre}</p>
              <p className="text-xs text-muted-foreground mt-1">{formatARS(top.totalPagado)} · {top.totalPedidos} pedidos</p>
            </div>
          )}
        </div>
      )}

      {/* Tabla con buscador */}
      <ClientesTable clientes={clientes} />
    </div>
  )
}
