import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { signOutCliente } from '@/lib/actions/auth'
import type { FilamentoPedido } from '@/lib/actions/filamento-pedidos'
import { getMembresiaCliente, solicitarExtensionMembresia } from '@/lib/actions/filamento-pedidos'
import { getVentasDeUsuario } from '@/lib/actions/filamentos'
import type { VentaFilamento } from '@/lib/filamentos-helpers'
import { TIERS_MEMBRESIA, costoExtension, DIAS_EXTENSION } from '@/lib/membresia-helpers'
import { getMyProfile } from '@/lib/actions/perfil'
import CuentaPedidosTab from '@/components/store/CuentaPedidosTab'
import PerfilTab from '@/components/store/PerfilTab'
import Link from 'next/link'
import { Package, Crown, User } from 'lucide-react'

export const metadata = { title: 'Mi cuenta — DDD ARG' }
export const dynamic = 'force-dynamic'

function fmtARS(n: number) { return `$${n.toLocaleString('es-AR')}` }
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
}

const KG_ACTIVACION = 5   // kg mínimos para activar membresía
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
  const [pedidosResult, membresia, ventasHistoricas, profile] = await Promise.all([
    db.from('filamento_pedidos')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .catch(() => ({ data: [] as FilamentoPedido[] })),
    getMembresiaCliente(user.id).catch((err) => { console.error('membresia error:', err); return null }),
    getVentasDeUsuario(user.id).catch(() => []),
    getMyProfile().catch(() => null),
  ])
  const pedidos = pedidosResult.data

  const { tab: tabParam } = await searchParams
  const tab = tabParam === 'pedidos' ? 'pedidos' : tabParam === 'membresia' ? 'membresia' : 'perfil'

  const displayName = profile?.apodo || user.user_metadata?.full_name || user.email?.split('@')[0] || ''
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
                  {membresia.esTrial && ' · Prueba'}
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
            tab === 'perfil'
              ? 'border-foreground text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <User size={14} />
          Mi perfil
          {!profile?.telefono && (
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" title="Completar datos" />
          )}
        </Link>
        <Link
          href="/cuenta?tab=pedidos"
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

      {/* ── TAB PERFIL ── */}
      {tab === 'perfil' && (
        <PerfilTab
          nombre={user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? ''}
          email={user.email ?? ''}
          avatarUrl={user.user_metadata?.avatar_url ?? null}
          profile={profile}
        />
      )}

      {/* ── TAB PEDIDOS ── */}
      {tab === 'pedidos' && (
        <CuentaPedidosTab
          pedidos={(pedidos ?? []) as FilamentoPedido[]}
          ventasHistoricas={ventasHistoricas as VentaFilamento[]}
          userId={user.id}
        />
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
              {membresia.esTrial && (
                <div className="mb-4 px-3 py-2 rounded-xl text-xs font-medium" style={{ backgroundColor: '#1a2e1a', border: '1px solid #166534', color: '#86efac' }}>
                  🎉 <strong style={{ color: '#f0fdf4' }}>Período de prueba</strong> — Disfrutás precios mayoristas por 5 días gratis. ¡Hacé tu primer pedido para activar la membresía completa!
                </div>
              )}
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <p className="font-black text-lg leading-none mb-1" style={{ color: '#f0fdf4' }}>
                    {TIERS_MEMBRESIA.find(t => t.label === membresia.nivel)?.emoji}{' '}
                    Mayorista {membresia.nivel !== 'Mayorista' && membresia.nivel}
                    {membresia.esTrial && <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: '#166534', color: '#86efac' }}>Prueba</span>}
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
                  🔄 Acumulá <strong style={{ color: '#f0fdf4' }}>5 kg más</strong> antes del vencimiento y el período se reinicia 30 días desde esa última compra.
                  Cada 5 kg adicionales subís de nivel automáticamente.
                </p>
              </div>

              {/* Botón extensión — visible cuando quedan ≤10 días */}
              {membresia.diasRestantes <= 10 && (() => {
                const costoExt = costoExtension(membresia.nivel)
                return (
                  <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #d97706' }}>
                    <div className="px-4 py-3" style={{ backgroundColor: 'rgba(217,119,6,0.15)' }}>
                      <p className="text-sm font-black mb-0.5" style={{ color: '#fcd34d' }}>
                        ⚡ Extender {DIAS_EXTENSION} días — ${costoExt.toLocaleString('es-AR')}
                      </p>
                      <p className="text-xs" style={{ color: '#86efac' }}>
                        Hacé una transferencia y avisanos por WhatsApp. Confirmamos manualmente.
                      </p>
                    </div>
                    {membresia.extensionPendiente ? (
                      <div className="px-4 py-2.5 text-center" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
                        <p className="text-xs font-semibold" style={{ color: '#86efac' }}>
                          ⏳ Solicitud enviada — esperando confirmación
                        </p>
                      </div>
                    ) : (
                      <form action={async () => { 'use server'; await solicitarExtensionMembresia() }}>
                        <button
                          type="submit"
                          className="w-full px-4 py-2.5 text-xs font-bold transition-opacity hover:opacity-90"
                          style={{ backgroundColor: 'rgba(217,119,6,0.25)', color: '#fcd34d' }}
                        >
                          Solicitar extensión →
                        </button>
                      </form>
                    )}
                  </div>
                )
              })()}
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
                  Te faltan <strong className="text-foreground">{(KG_ACTIVACION - membresia.kgPeriodo).toFixed(1)} kg</strong> para activar tu descuento mayorista.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground mb-4">
                  Todavía no tenés una membresía activa. Con tu primer pedido de <strong className="text-foreground">5 kg o más</strong>, la activás automáticamente.
                </p>
              )}
              <div className="h-2.5 bg-black/10 dark:bg-white/10 rounded-full mb-1 overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all"
                  style={{ width: `${Math.min(100, ((membresia?.kgPeriodo ?? 0) / KG_ACTIVACION) * 100)}%` }}
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
                  Acumulá <strong className="text-foreground">5 kg</strong> (en uno o varios pedidos) y tu membresía Mayorista se activa automáticamente.
                  El período dura <strong className="text-foreground">30 días</strong> desde ese último pedido que completó los 5 kg.
                </p>
              </div>
              <div className="flex gap-3">
                <span className="text-lg shrink-0">2️⃣</span>
                <p>
                  Los kg se <strong className="text-foreground">acumulan dentro del período activo</strong>.
                  Cada vez que sumás 5 kg más (10 kg total → Plus, 15 kg total → Elite), subís de nivel y el período se reinicia 30 días desde esa fecha.
                </p>
              </div>
              <div className="flex gap-3">
                <span className="text-lg shrink-0">3️⃣</span>
                <p>
                  Para <strong className="text-foreground">renovar</strong>, acumulá 5 kg más antes de que venza.
                  El período se reinicia exactamente 30 días desde ese último pedido — los días restantes no se suman.
                </p>
              </div>
              <div className="flex gap-3">
                <span className="text-lg shrink-0">4️⃣</span>
                <p>
                  Si te quedan 10 días o menos, podés <strong className="text-foreground">extender 15 días</strong> abonando por transferencia.
                  El costo varía según tu nivel actual.
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
              <p className="text-sm text-gray-200 leading-relaxed mb-3">
                No hay letra chica. No hay cuota mensual. Solo comprás, el sistema lo detecta,
                y el descuento se aplica solo en tu próximo pedido.
              </p>
              <p className="text-sm leading-relaxed" style={{ color: '#86efac' }}>
                💡 El descuento aplica <strong style={{ color: '#f0fdf4' }}>dentro del mismo pedido</strong>: si ya tenés 4 kg acumulados y agregás 1 kg más, ese último kilogramo entra con precio mayorista. Si comprás 5 kg de una sola vez, ya entran todos con descuento.
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
