import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { signOut } from '@/lib/actions/auth'
import type { FilamentoPedido } from '@/lib/actions/filamento-pedidos'
import { getMembresiaCliente } from '@/lib/actions/filamento-pedidos'
import { TIERS_MEMBRESIA } from '@/lib/membresia-helpers'
import Link from 'next/link'
import { Package, Clock, CheckCircle2, XCircle, Truck, Crown } from 'lucide-react'

export const metadata = { title: 'Mi cuenta — DDD ARG' }
export const dynamic = 'force-dynamic'

const ESTADO_CONFIG = {
  pendiente:  { label: 'Pendiente de confirmación', icon: Clock,        cls: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' },
  confirmado: { label: 'Confirmado',               icon: CheckCircle2, cls: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
  entregado:  { label: 'Entregado',                icon: Truck,        cls: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
  cancelado:  { label: 'Cancelado',                icon: XCircle,      cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
} as const

function fmtARS(n: number) { return `$${n.toLocaleString('es-AR')}` }
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
}

const KG_RENOVACION = 5
const TIER_MAX = TIERS_MEMBRESIA[0].min   // 15 kg

// Estilos por nivel
const NIVEL_STYLES = {
  Elite:     { bg: 'from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20', border: 'border-violet-200 dark:border-violet-700', badge: 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300 border-violet-200 dark:border-violet-700', bar: 'bg-violet-500', note: 'text-violet-800 dark:text-violet-300', divider: 'border-violet-200 dark:border-violet-700/50' },
  Plus:      { bg: 'from-blue-50 to-sky-50 dark:from-blue-900/20 dark:to-sky-900/20',           border: 'border-blue-200 dark:border-blue-700',   badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-700',     bar: 'bg-blue-500',   note: 'text-blue-800 dark:text-blue-300',   divider: 'border-blue-200 dark:border-blue-700/50'   },
  Mayorista: { bg: 'from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20',   border: 'border-amber-200 dark:border-amber-700', badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-700', bar: 'bg-amber-500', note: 'text-amber-800 dark:text-amber-300', divider: 'border-amber-200 dark:border-amber-700/50' },
}

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
  const styles = membresia?.nivel ? NIVEL_STYLES[membresia.nivel as keyof typeof NIVEL_STYLES] : null

  // Calcular próximo tier disponible
  const siguienteTier = membresia?.nivel
    ? TIERS_MEMBRESIA[TIERS_MEMBRESIA.findIndex(t => t.label === membresia.nivel) - 1]
    : TIERS_MEMBRESIA[TIERS_MEMBRESIA.length - 1]

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
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold">{displayName}</h1>
              {membresia?.nivel && styles && (
                <span className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full border ${styles.badge}`}>
                  <Crown size={11} />
                  {membresia.nivel === 'Mayorista' ? 'Mayorista' : `Mayorista ${membresia.nivel}`}
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

      {/* Widget de membresía */}
      {membresia?.nivel && styles ? (
        /* ── Tiene membresía activa ── */
        <div className={`mb-8 rounded-2xl border p-5 bg-gradient-to-br ${styles.bg} ${styles.border}`}>
          {/* Título y precio */}
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <p className="font-black text-lg leading-none mb-1">
                {TIERS_MEMBRESIA.find(t => t.label === membresia.nivel)?.emoji}{' '}
                Mayorista {membresia.nivel !== 'Mayorista' && membresia.nivel}
              </p>
              <p className="text-xs text-muted-foreground">
                Descuento: <strong className="text-foreground">−{fmtARS(membresia.descuento)}/kg</strong> sobre cualquier precio
                {' '}· Vence {fmtDate(membresia.periodoFin)}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-2xl font-black tabular-nums leading-none">
                {membresia.kgPeriodo}
                <span className="text-sm font-medium text-muted-foreground"> / {TIER_MAX} kg</span>
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{membresia.diasRestantes} días restantes</p>
            </div>
          </div>

          {/* Barra de progreso (con marcas de tier) */}
          <div className="relative mb-1">
            <div className="h-3 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${styles.bar}`}
                style={{ width: `${Math.min(100, (membresia.kgPeriodo / TIER_MAX) * 100)}%` }}
              />
            </div>
            {/* Marcas de tier */}
            {TIERS_MEMBRESIA.slice().reverse().map(t => (
              <div
                key={t.min}
                className="absolute top-0 h-3 w-px bg-black/20 dark:bg-white/30"
                style={{ left: `${(t.min / TIER_MAX) * 100}%` }}
                title={`${t.label} (${t.min} kg)`}
              />
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground mb-3">
            {TIERS_MEMBRESIA.slice().reverse().map(t => (
              <span key={t.min} style={{ position: 'relative', left: `${(t.min / TIER_MAX) * 100 - 5}%` }}>
                {t.emoji} {t.min}kg
              </span>
            ))}
          </div>

          {/* Próximo nivel si lo hay */}
          {siguienteTier && (
            <div className={`pt-3 border-t ${styles.divider}`}>
              <p className={`text-xs font-medium ${styles.note}`}>
                {siguienteTier.emoji} Faltan <strong>{siguienteTier.min - membresia.kgPeriodo} kg</strong> para{' '}
                Mayorista {siguienteTier.label} — descuento −{fmtARS(siguienteTier.descuento)}/kg
              </p>
            </div>
          )}

          {/* Info renovación */}
          <div className={`pt-3 border-t ${styles.divider} mt-3`}>
            <p className={`text-xs ${styles.note}`}>
              🔄 Comprando <strong>{KG_RENOVACION} kg o más</strong> antes del vencimiento extendés la membresía 30 días automáticamente
            </p>
          </div>
        </div>
      ) : (
        /* ── Sin membresía: mostrar escala de tiers ── */
        <div className="mb-8 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Crown size={16} className="text-muted-foreground" />
            <span className="font-bold text-sm">Membresía Mayorista</span>
          </div>

          <p className="text-xs text-muted-foreground mb-4">
            Acumulá 5 kg o más en pedidos confirmados dentro de un período de 30 días y desbloqueás precios especiales.
            Comprando 5 kg o más en un solo pedido antes del vencimiento, renovás el período automáticamente.
          </p>

          <div className="space-y-2 mb-4">
            {TIERS_MEMBRESIA.slice().reverse().map(t => (
              <div key={t.min} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className="text-base">{t.emoji}</span>
                  <span className="font-medium">
                    {t.label === 'Mayorista' ? 'Mayorista' : `Mayorista ${t.label}`}
                  </span>
                  <span className="text-xs text-muted-foreground">{t.min}+ kg</span>
                </span>
                <span className="font-bold tabular-nums text-orange-600 dark:text-orange-400">−{fmtARS(t.descuento)}/kg</span>
              </div>
            ))}
          </div>

          {/* Barra vacía */}
          <div className="h-2.5 bg-black/10 dark:bg-white/10 rounded-full mb-1" />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>0 kg</span>
            <span>5 kg → Mayorista</span>
          </div>

          {membresia && !membresia.nivel && membresia.kgPeriodo > 0 && (
            <p className="text-xs text-muted-foreground mt-3 text-center">
              Tenés {membresia.kgPeriodo} kg acumulados este período. ¡Te faltan {5 - membresia.kgPeriodo} kg!
            </p>
          )}

          <Link href="/filamentos" className="inline-flex w-full items-center justify-center gap-2 mt-4 text-sm font-bold bg-orange-500 hover:bg-orange-600 text-white rounded-xl px-5 py-2.5 transition-colors">
            Ver filamentos disponibles →
          </Link>
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
