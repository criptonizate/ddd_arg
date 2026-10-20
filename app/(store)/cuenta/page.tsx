import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { signOut } from '@/lib/actions/auth'
import type { FilamentoPedido } from '@/lib/actions/filamento-pedidos'
import { getMembresiaCliente } from '@/lib/actions/filamento-pedidos'
import Link from 'next/link'
import { Package, Clock, CheckCircle2, XCircle, Truck, Crown, TrendingUp } from 'lucide-react'

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

const KG_MAYORISTA = 5

export default async function CuentaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/?login=1')

  const db = createServiceClient()
  const [{ data: pedidos }, membresia] = await Promise.all([
    db.from('filamento_pedidos')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    getMembresiaCliente(user.id),
  ])

  const displayName = user.user_metadata?.full_name ?? user.email?.split('@')[0]

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          {user.user_metadata?.avatar_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.user_metadata.avatar_url} alt="" className="w-12 h-12 rounded-full border border-border" />
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{displayName}</h1>
              {membresia?.esMayorista && (
                <span className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-700">
                  <Crown size={11} />
                  Mayorista
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>
        <form action={signOut}>
          <button type="submit" className="text-xs text-muted-foreground hover:text-foreground underline">
            Cerrar sesión
          </button>
        </form>
      </div>

      {/* Widget de membresía mayorista */}
      {membresia ? (
        <div className={`mb-8 rounded-2xl border p-5 ${
          membresia.esMayorista
            ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200 dark:from-amber-900/20 dark:to-orange-900/20 dark:border-amber-700'
            : 'bg-card border-border'
        }`}>
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp size={16} className={membresia.esMayorista ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'} />
                <span className="font-bold text-sm">
                  {membresia.esMayorista ? '🏆 Cuenta Mayorista activa' : 'Progreso mayorista'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {membresia.esMayorista
                  ? `Precio especial $20.000/kg garantizado hasta el ${fmtDate(membresia.periodoFin)}`
                  : `Comprá ${KG_MAYORISTA - membresia.kgPeriodo} kg más este período para acceder al precio mayorista ($20.000/kg)`
                }
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-2xl font-black tabular-nums leading-none">
                {membresia.kgPeriodo}<span className="text-sm font-medium text-muted-foreground"> / {KG_MAYORISTA} kg</span>
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{membresia.diasRestantes}d restantes</p>
            </div>
          </div>

          {/* Barra de progreso */}
          <div className="h-2.5 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                membresia.esMayorista ? 'bg-amber-500' : 'bg-orange-500'
              }`}
              style={{ width: `${Math.min(100, (membresia.kgPeriodo / KG_MAYORISTA) * 100)}%` }}
            />
          </div>

          <div className="flex justify-between text-[10px] text-muted-foreground mt-1.5">
            <span>Período: {fmtDate(membresia.periodoInicio)}</span>
            <span>Vence: {fmtDate(membresia.periodoFin)}</span>
          </div>

          {membresia.esMayorista && (
            <div className="mt-3 pt-3 border-t border-amber-200 dark:border-amber-700/50 flex items-center gap-2">
              <Crown size={12} className="text-amber-600 dark:text-amber-400 shrink-0" />
              <p className="text-xs text-amber-800 dark:text-amber-300 font-medium">
                Tu precio garantizado este período: <strong>$20.000/kg</strong> — incluso en pedidos de 1 kg
              </p>
            </div>
          )}
        </div>
      ) : (
        /* Si nunca compró, mostrar el teaser */
        <div className="mb-8 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={16} className="text-muted-foreground" />
            <span className="font-bold text-sm">Membresía mayorista</span>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Comprá 5 kg o más en un período de 30 días y desbloqueás el precio mayorista: <strong className="text-foreground">$20.000/kg</strong> garantizado por ese período, sin importar la cantidad del pedido.
          </p>
          <div className="h-2 bg-black/10 dark:bg-white/10 rounded-full" />
          <p className="text-[10px] text-muted-foreground mt-1.5 text-right">0 / 5 kg</p>
        </div>
      )}

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

                  <div className="px-5 py-3 space-y-1.5">
                    {p.items.map((item, i) => (
                      <div key={i} className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-muted-foreground">{item.rollos}x {item.color} — {item.material} ({item.marca})</span>
                        <span className="font-mono text-xs">{fmtARS(item.rollos * item.precio_unitario)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between px-5 py-3 bg-secondary/20 border-t border-border">
                    <span className="text-xs text-muted-foreground">
                      {p.total_rollos} kg
                      {p.descuento_por_rollo > 0 && ` · Desc. ${fmtARS(p.descuento_por_rollo)}/kg`}
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
