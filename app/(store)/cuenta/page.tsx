import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { signOutCliente } from '@/lib/actions/auth'
import type { FilamentoPedido } from '@/lib/actions/filamento-pedidos'
import { getMembresiaCliente } from '@/lib/actions/filamento-pedidos'
import { getVentasDeUsuario } from '@/lib/actions/filamentos'
import type { VentaFilamento } from '@/lib/filamentos-helpers'
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

const NIVEL_STYLES = {
  Elite:     { cardBg: '#1e1330', cardBorder: '#7c3aed', bar: '#7c3aed', barBg: '#2d1b4e', badge: 'bg-violet-900/60 text-violet-300 border-violet-700', divider: '#3b1f6a' },
  Plus:      { cardBg: '#0e1e35', cardBorder: '#2563eb', bar: '#2563eb', barBg: '#1a2f50', badge: 'bg-blue-900/60 text-blue-300 border-blue-700',       divider: '#1a3a6e' },
  Mayorista: { cardBg: '#1a1500', cardBorder: '#d97706', bar: '#d97706', barBg: '#2e2300', badge: 'bg-amber-900/60 text-amber-300 border-amber-700',    divider: '#3d2e00' },
}

export default async function CuentaPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/?login=1')

  const db = createServiceClient()
  const [{ data: pedidos }, membresia, ventasHistoricas] = await Promise.all([
    db.from('filamento_pedidos')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    getMembresiaCliente(user.id),
    getVentasDeUsuario(user.id),
  ])

  const { tab: tabParam } = await searchParams
  const tab = tabParam === 'membresia' ? 'membresia' : 'pedidos'

  const displayName = user.user_metadata?.full_name ?? user.email?.split('@')[0]
  const styles = membresia?.nivel ? NIVEL_STYLES[membresia.nivel as keyof typeof NIVEL_STYLES] : null

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
        <form action={signOutCliente}>
          <button type="submit" className="text-xs text-muted-foreground hover:text-foreground underline">
            Cerrar sesión
          </button>
        </form>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border mb-8">
        <Link
          href="/cuenta"
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
            tab === 'pedidos'
              ? 'border-foreground text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Package size={14} />
          Mis pedidos
        </Link>
        <Link
          href="/cuenta?tab=membresia"
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
            tab === 'membresia'
              ? 'border-foreground text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Crown size={14} />
          Membresía
          {membresia?.nivel && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${styles?.badge}`}>
              {TIERS_MEMBRESIA.find(t => t.label === membresia.nivel)?.emoji} {membresia.nivel}
            </span>
          )}
        </Link>
      </div>

      {/* ── TAB PEDIDOS ── */}
      {tab === 'pedidos' && (
        <>
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
                    <div className="px-5 py-3 space-y-3">
                      {p.items.map((item, i) => {
                        const precioBase = item.precio_unitario + p.descuento_por_rollo
                        const precioFinal = item.precio_unitario
                        const subtotalItem = item.rollos * precioFinal
                        return (
                          <div key={i} className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-foreground truncate">
                                {item.rollos} kg · {item.color}
                              </p>
                              <p className="text-xs text-muted-foreground">{item.material} — {item.marca}</p>
                              {p.descuento_por_rollo > 0 && (
                                <p className="text-xs mt-0.5">
                                  <span className="line-through text-muted-foreground">{fmtARS(precioBase)}/kg</span>
                                  <span className="ml-1.5 font-semibold" style={{ color: '#22c55e' }}>
                                    − {fmtARS(p.descuento_por_rollo)}/kg
                                  </span>
                                  <span className="ml-1.5 font-bold text-foreground">{fmtARS(precioFinal)}/kg</span>
                                </p>
                              )}
                            </div>
                            <span className="font-bold text-sm shrink-0 tabular-nums">{fmtARS(subtotalItem)}</span>
                          </div>
                        )
                      })}
                    </div>
                    <div className="flex items-center justify-between px-5 py-3 border-t border-border" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                      <span className="text-xs text-muted-foreground">{p.total_rollos} kg total</span>
                      <span className="font-black text-sm">{fmtARS(p.total)}</span>
                    </div>
                    {p.estado === 'pendiente' && (() => {
                      const itemLines = p.items.map((i: { rollos: number; color: string; material: string; marca: string }) =>
                        `  • ${i.rollos} kg de ${i.color} (${i.material} ${i.marca})`
                      ).join('\n')
                      const msg = [
                        `Hola! Te recuerdo el pedido N° ${p.numero} que hice el ${fmtDate(p.created_at)}.`,
                        ``,
                        `*Detalle:*`,
                        itemLines,
                        ``,
                        `*Total: ${fmtARS(p.total)}*`,
                        ``,
                        `Quedo esperando confirmación para coordinar el pago y la entrega. 🙌`,
                      ].join('\n')
                      return (
                        <div className="px-5 py-3 border-t border-border">
                          <a
                            href={`https://wa.me/543804559909?text=${encodeURIComponent(msg)}`}
                            target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-xs font-semibold px-3.5 py-2 rounded-xl bg-[#25D366]/10 text-[#128C7E] dark:text-[#25D366] border border-[#25D366]/30 hover:bg-[#25D366]/20 transition-colors"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                              <path d="M11.999 2C6.477 2 2 6.477 2 12c0 1.936.53 3.744 1.452 5.29L2.046 22l4.799-1.396A9.956 9.956 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 11.999 2zm.001 18a7.96 7.96 0 01-4.073-1.117l-.291-.174-3.028.881.86-3.105-.19-.3A7.96 7.96 0 014 12c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8-8 8z"/>
                            </svg>
                            Enviar recordatorio por WhatsApp
                          </a>
                        </div>
                      )
                    })()}
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

          {/* Historial de compras previas */}
          {ventasHistoricas.length > 0 && (
            <section className="mt-8">
              <h2 className="text-base font-bold mb-4 flex items-center gap-2 text-muted-foreground">
                <span>🧾</span>
                Compras anteriores
              </h2>
              <div className="bg-card border border-border rounded-2xl overflow-hidden">
                <div className="divide-y divide-border">
                  {(ventasHistoricas as VentaFilamento[]).map(v => (
                    <div key={v.id} className="px-5 py-3.5 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">
                          {(v.gramos / 1000).toFixed(1)} kg · {v.filamento_color ?? '—'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {v.filamento_material} {v.filamento_marca && `— ${v.filamento_marca}`}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold">{fmtARS((v.gramos / 1000) * v.precio_kg)}</p>
                        <p className="text-xs text-muted-foreground">{fmtDate(v.fecha)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}
        </>
      )}

      {/* ── TAB MEMBRESÍA ── */}
      {tab === 'membresia' && (
        <div className="space-y-6">

          {/* Widget de estado actual */}
          {membresia?.nivel && styles ? (
            <div
              className="rounded-2xl border p-5"
              style={{ backgroundColor: styles.cardBg, borderColor: styles.cardBorder }}
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <p className="font-black text-lg leading-none mb-1" style={{ color: '#f0fdf4' }}>
                    {TIERS_MEMBRESIA.find(t => t.label === membresia.nivel)?.emoji}{' '}
                    Mayorista {membresia.nivel !== 'Mayorista' && membresia.nivel}
                  </p>
                  <p className="text-xs mt-1" style={{ color: '#86efac' }}>
                    Descuento activo: <strong style={{ color: '#f0fdf4' }}>−{fmtARS(membresia.descuento)}/kg</strong>
                    {' '}· Vence {fmtDate(membresia.periodoFin)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-2xl font-black tabular-nums leading-none" style={{ color: '#f0fdf4' }}>
                    {membresia.kgPeriodo.toFixed(1)}
                    <span className="text-sm font-medium" style={{ color: '#86efac' }}> / {TIER_MAX} kg</span>
                  </p>
                  <p className="text-[11px] mt-0.5" style={{ color: '#86efac' }}>{membresia.diasRestantes} días restantes</p>
                </div>
              </div>

              <div className="relative mb-1">
                <div className="h-3 rounded-full overflow-hidden" style={{ backgroundColor: styles.barBg }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${Math.min(100, (membresia.kgPeriodo / TIER_MAX) * 100)}%`, backgroundColor: styles.bar }}
                  />
                </div>
                {TIERS_MEMBRESIA.slice().reverse().map(t => (
                  <div key={t.min} className="absolute top-0 h-3 w-px" style={{ left: `${(t.min / TIER_MAX) * 100}%`, backgroundColor: 'rgba(255,255,255,0.2)' }} />
                ))}
              </div>
              <div className="relative h-5 mb-4">
                {TIERS_MEMBRESIA.slice().reverse().map(t => {
                  const pct = (t.min / TIER_MAX) * 100
                  return (
                    <span
                      key={t.min}
                      className="absolute text-[10px] whitespace-nowrap"
                      style={{
                        color: '#86efac',
                        left: `${pct}%`,
                        transform: pct >= 90 ? 'translateX(-100%)' : pct <= 10 ? 'translateX(0)' : 'translateX(-50%)',
                        top: 0,
                      }}
                    >
                      {t.emoji} {t.min}kg
                    </span>
                  )
                })}
              </div>

              {siguienteTier && (() => {
                const faltan = siguienteTier.min - membresia.kgPeriodo
                return (
                  <div
                    className="rounded-xl px-4 py-3.5 mb-3"
                    style={{ backgroundColor: 'rgba(255,255,255,0.07)', border: `1px solid ${styles.cardBorder}` }}
                  >
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div>
                        <p className="text-sm font-black" style={{ color: '#f0fdf4' }}>
                          {siguienteTier.emoji} Te faltan solo <span style={{ color: styles.bar }}>{faltan.toFixed(1)} kg</span> para subir
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: '#86efac' }}>
                          Mayorista {siguienteTier.label} · −{fmtARS(siguienteTier.descuento)}/kg en todos los filamentos
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[10px] font-semibold" style={{ color: '#86efac' }}>ahorrás</p>
                        <p className="text-lg font-black" style={{ color: styles.bar }}>
                          +{fmtARS((siguienteTier.descuento - membresia.descuento) * siguienteTier.min)}/pedido
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })()}

              <div className="rounded-xl px-4 py-3" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <p className="text-xs" style={{ color: '#86efac' }}>
                  🔄 Comprá <strong style={{ color: '#f0fdf4' }}>{KG_RENOVACION} kg o más</strong> antes del vencimiento y extendés el período 30 días automáticamente
                </p>
              </div>
            </div>
          ) : (
            /* Sin membresía activa */
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center gap-2 mb-3">
                <Crown size={16} className="text-muted-foreground" />
                <span className="font-bold text-sm">Tu membresía</span>
              </div>
              {membresia && membresia.kgPeriodo > 0 ? (
                <p className="text-sm text-muted-foreground mb-4">
                  Tenés <strong className="text-foreground">{membresia.kgPeriodo.toFixed(1)} kg</strong> acumulados este período.
                  Te faltan <strong className="text-foreground">{(KG_RENOVACION - membresia.kgPeriodo).toFixed(1)} kg</strong> para activar tu descuento mayorista.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground mb-4">
                  Todavía no tenés una membresía activa. Con tu primer pedido de <strong className="text-foreground">5 kg o más</strong>, la activás automáticamente.
                </p>
              )}
              <div className="h-2.5 bg-black/10 dark:bg-white/10 rounded-full mb-1 overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all"
                  style={{ width: `${Math.min(100, ((membresia?.kgPeriodo ?? 0) / KG_RENOVACION) * 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground mb-4">
                <span>{(membresia?.kgPeriodo ?? 0).toFixed(1)} kg acumulados</span>
                <span>5 kg → activa</span>
              </div>
              <Link href="/filamentos" className="inline-flex w-full items-center justify-center gap-2 text-sm font-bold text-white rounded-xl px-5 py-2.5 transition-colors hover:opacity-90" style={{ backgroundColor: '#16a34a' }}>
                Ver filamentos disponibles →
              </Link>
            </div>
          )}

          {/* Tiers */}
          <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
            <h3 className="font-bold text-sm mb-1">Niveles de descuento</h3>
            {TIERS_MEMBRESIA.slice().reverse().map(t => {
              const activo = membresia?.nivel === t.label
              return (
                <div
                  key={t.min}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-colors ${
                    activo ? 'border-green-500 bg-green-500/5' : 'border-border'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{t.emoji}</span>
                    <div>
                      <p className="text-sm font-bold">
                        Mayorista {t.label !== 'Mayorista' && t.label}
                        {activo && <span className="ml-2 text-[10px] font-semibold text-green-600 dark:text-green-400">← tu nivel actual</span>}
                      </p>
                      <p className="text-xs text-muted-foreground">{t.min} kg o más en 30 días</p>
                    </div>
                  </div>
                  <p className="font-black tabular-nums text-sm" style={{ color: '#16a34a' }}>−{fmtARS(t.descuento)}/kg</p>
                </div>
              )
            })}
          </div>

          {/* Cómo funciona */}
          <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <h3 className="font-bold text-sm">¿Cómo funciona?</h3>
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="flex gap-3">
                <span className="text-lg shrink-0">1️⃣</span>
                <p>
                  Hacé un pedido de <strong className="text-foreground">5 kg o más</strong> y tu membresía se activa automáticamente.
                  El sistema lo detecta solo, sin trámites ni suscripciones.
                </p>
              </div>
              <div className="flex gap-3">
                <span className="text-lg shrink-0">2️⃣</span>
                <p>
                  Tus <strong className="text-foreground">descuentos duran 30 días</strong> desde la última compra que los activó.
                  Cuantos más kg en ese período, mayor el descuento que desbloqueás.
                </p>
              </div>
              <div className="flex gap-3">
                <span className="text-lg shrink-0">3️⃣</span>
                <p>
                  Para <strong className="text-foreground">mantener el descuento</strong>, comprá al menos 5 kg antes de que venza el período
                  y se extiende 30 días más automáticamente desde esa fecha.
                </p>
              </div>
              <div className="flex gap-3">
                <span className="text-lg shrink-0">4️⃣</span>
                <p>
                  Los kg se <strong className="text-foreground">acumulan dentro del período</strong>.
                  Si comprás 3 kg hoy y 7 kg en dos semanas, ya tenés 10 kg acumulados y accedés al nivel Plus.
                </p>
              </div>
            </div>
          </div>

          {/* Bloque de comunidad */}
          <div className="rounded-2xl border border-border overflow-hidden">
            <div className="px-5 py-5" style={{ background: 'linear-gradient(135deg, #0f1117 0%, #1a1f2e 100%)' }}>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">¿Por qué existe esto?</p>
              <p className="text-base font-bold text-white leading-snug mb-3">
                Somos todos makers. Sabemos lo que cuesta conseguir buen filamento.
              </p>
              <p className="text-sm text-gray-200 leading-relaxed mb-4">
                Imprimir mucho tiene un costo real: horas de máquina, energía, y sobre todo material.
                Por eso creamos el programa mayorista — no como un truco de marketing, sino porque
                si imprimís en serio, queremos que el precio del filamento no sea el freno.
              </p>
              <p className="text-sm text-gray-200 leading-relaxed">
                No hay letra chica. No hay cuota mensual. Solo comprás, el sistema lo detecta,
                y el descuento se aplica solo en tu próximo pedido.
              </p>
            </div>
            <div className="px-5 py-4 border-t border-border bg-card">
              <p className="text-xs text-muted-foreground">
                ¿Tenés preguntas sobre tu membresía?{' '}
                <a
                  href="https://wa.me/543804559909"
                  target="_blank" rel="noopener noreferrer"
                  className="font-semibold text-foreground underline hover:no-underline"
                >
                  Escribinos por WhatsApp
                </a>
              </p>
            </div>
          </div>

        </div>
      )}

    </div>
  )
}
