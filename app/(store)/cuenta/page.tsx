import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { signOut } from '@/lib/actions/auth'
import type { FilamentoPedido } from '@/lib/actions/filamento-pedidos'
import Link from 'next/link'
import { Package, Clock, CheckCircle2, XCircle, Truck } from 'lucide-react'

export const metadata = { title: 'Mi cuenta — DDD ARG' }
export const dynamic = 'force-dynamic'

const ESTADO_CONFIG = {
  pendiente:   { label: 'Pendiente de confirmación', icon: Clock,         cls: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' },
  confirmado:  { label: 'Confirmado',                icon: CheckCircle2,  cls: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
  entregado:   { label: 'Entregado',                 icon: Truck,         cls: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
  cancelado:   { label: 'Cancelado',                 icon: XCircle,       cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
} as const

function fmtARS(n: number) {
  return `$${n.toLocaleString('es-AR')}`
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function CuentaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/?login=1')

  const db = createServiceClient()
  const { data: pedidos } = await db
    .from('filamento_pedidos')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const displayName = user.user_metadata?.full_name ?? user.email?.split('@')[0]

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">

      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-3">
          {user.user_metadata?.avatar_url && (
            <img src={user.user_metadata.avatar_url} alt="" className="w-12 h-12 rounded-full border border-border" />
          )}
          <div>
            <h1 className="text-2xl font-bold">{displayName}</h1>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>
        <form action={signOut}>
          <button type="submit" className="text-xs text-muted-foreground hover:text-foreground underline">
            Cerrar sesión
          </button>
        </form>
      </div>

      {/* Mis pedidos */}
      <section>
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Package size={18} />
          Mis pedidos de filamentos
        </h2>

        {!pedidos?.length ? (
          <div className="text-center py-16 bg-secondary/20 rounded-2xl border border-border">
            <p className="text-4xl mb-3">🎨</p>
            <p className="font-medium text-muted-foreground">Todavía no hiciste ningún pedido</p>
            <Link href="/filamentos" className="inline-flex items-center gap-1.5 mt-4 text-sm font-medium bg-foreground text-background rounded-xl px-5 py-2.5 hover:opacity-90 transition-opacity">
              Ver filamentos disponibles →
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {(pedidos as FilamentoPedido[]).map(p => {
              const cfg = ESTADO_CONFIG[p.estado] ?? ESTADO_CONFIG.pendiente
              const Icon = cfg.icon
              return (
                <div key={p.id} className="bg-card border border-border rounded-2xl overflow-hidden">
                  {/* Header del pedido */}
                  <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-sm">Pedido N° {p.numero}</span>
                      <span className="text-xs text-muted-foreground">{fmtDate(p.created_at)}</span>
                    </div>
                    <span className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.cls}`}>
                      <Icon size={11} />
                      {cfg.label}
                    </span>
                  </div>

                  {/* Items */}
                  <div className="px-5 py-3 space-y-1.5">
                    {p.items.map((item, i) => (
                      <div key={i} className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-muted-foreground">{item.rollos}x {item.color} — {item.material} ({item.marca})</span>
                        <span className="font-mono text-xs">{fmtARS(item.rollos * item.precio_unitario)}</span>
                      </div>
                    ))}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between px-5 py-3 bg-secondary/20 border-t border-border">
                    <span className="text-xs text-muted-foreground">
                      {p.total_rollos} rollo{p.total_rollos !== 1 ? 's' : ''}
                      {p.descuento_por_rollo > 0 && ` · Desc. ${fmtARS(p.descuento_por_rollo)}/rollo`}
                    </span>
                    <span className="font-bold text-sm">{fmtARS(p.total)}</span>
                  </div>

                  {p.nota && (
                    <div className="px-5 py-2.5 text-xs text-muted-foreground bg-secondary/10 border-t border-border">
                      💬 {p.nota}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
