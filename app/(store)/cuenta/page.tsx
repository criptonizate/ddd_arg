import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { signOutCliente } from '@/lib/actions/auth'
import type { FilamentoPedido } from '@/lib/actions/filamento-pedidos'
import { getMembresiaCliente } from '@/lib/actions/filamento-pedidos'
import { getVentasDeUsuario } from '@/lib/actions/filamentos'
import type { VentaFilamento } from '@/lib/filamentos-helpers'
import { TIERS_MEMBRESIA, costoExtension, DIAS_EXTENSION } from '@/lib/membresia-helpers'
import { getMyProfile } from '@/lib/actions/perfil'
import { getSaldoCoins, getHistorialCoins, registrarLoginDiario } from '@/lib/actions/ddd-coins'
import CuentaPedidosTab from '@/components/store/CuentaPedidosTab'
import PerfilTab from '@/components/store/PerfilTab'
import ExtensionModal from '@/components/store/ExtensionModal'
import DDDCoinsTab from '@/components/store/DDDCoinsTab'
import MembresiaProgressBar from '@/components/store/MembresiaProgressBar'
import CoinsToast from '@/components/store/CoinsToast'
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
  Platino: { cardBg: '#1e1330', cardBorder: '#7c3aed', bar: '#7c3aed', barBg: '#2d1b4e', badge: 'bg-violet-900/60 text-violet-300 border-violet-700', divider: '#3b1f6a' },
  Oro:     { cardBg: '#0e1e35', cardBorder: '#2563eb', bar: '#2563eb', barBg: '#1a2f50', badge: 'bg-blue-900/60 text-blue-300 border-blue-700',       divider: '#1a3a6e' },
  Plata:   { cardBg: '#1a1500', cardBorder: '#d97706', bar: '#d97706', barBg: '#2e2300', badge: 'bg-amber-900/60 text-amber-300 border-amber-700',    divider: '#3d2e00' },
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
  // registrarLoginDiario corre en paralelo con el resto para no serializar latencia
  const [loginResult, pedidosResult, membresia, ventasHistoricas, profile, saldoCoins, historialCoins] = await Promise.all([
    registrarLoginDiario().catch(() => ({ ganados: 0, racha: 0 })),
    db.from('filamento_pedidos')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    getMembresiaCliente(user.id).catch((err) => { console.error('membresia error:', err); return null }),
    getVentasDeUsuario(user.id).catch(() => []),
    getMyProfile().catch(() => null),
    getSaldoCoins(user.id).catch(() => 0),
    getHistorialCoins(user.id).catch(() => []),
  ])
  const pedidos = pedidosResult.data

  const { tab: tabParam } = await searchParams
  const tab = tabParam === 'pedidos' ? 'pedidos' : tabParam === 'membresia' ? 'membresia' : tabParam === 'coins' ? 'coins' : 'perfil'

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
                  {membresia.nivel}
                  {membresia.esTrial && ' · Prueba'}
                </span>
              )}
              {saldoCoins > 0 && (
                <Link
                  href="/cuenta?tab=coins"
                  className="flex items-center gap-1.5 text-xs font-black px-3 py-1 rounded-full border transition-all hover:scale-105 active:scale-95"
                  style={{ background: 'oklch(0.22 0.04 60)', borderColor: '#d97706', color: '#f59e0b' }}
                >
                  🪙 {saldoCoins.toLocaleString('es-AR')} pts
                </Link>
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
        <Link
          href="/cuenta?tab=coins"
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
            tab === 'coins'
              ? 'border-yellow-500 text-yellow-500'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          🪙 Coins
          {saldoCoins > 0 && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: '#92400e', color: '#fde68a' }}>
              {saldoCoins}
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

      {/* ── TAB COINS ── */}
      {tab === 'coins' && (
        <DDDCoinsTab saldo={saldoCoins} historial={historialCoins as { id: string; puntos: number; motivo: string; created_at: string }[]} racha={loginResult.racha} />
      )}

      {/* ── TAB MEMBRESÍA ── */}
      {tab === 'membresia' && (
        <div className="space-y-4">

          {/* Card principal */}
          {membresia?.nivel && styles ? (
            <div className="rounded-2xl border p-5 space-y-5" style={{ backgroundColor: styles.cardBg, borderColor: styles.cardBorder }}>

              {/* Trial banner */}
              {membresia.esTrial && (
                <div className="px-3 py-2 rounded-xl text-xs" style={{ backgroundColor: 'rgba(22,101,52,0.4)', border: '1px solid #166534', color: '#86efac' }}>
                  🎉 <strong style={{ color: '#f0fdf4' }}>Período de prueba gratuito</strong> — Hacé tu primer pedido de 5 kg para activar la membresía completa.
                </div>
              )}

              {/* Nivel + días restantes */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#86efac' }}>Tu membresía</p>
                  <p className="font-black text-2xl leading-none" style={{ color: '#f0fdf4' }}>
                    {TIERS_MEMBRESIA.find(t => t.label === membresia.nivel)?.emoji}{' '}
                    {TIERS_MEMBRESIA.find(t => t.label === membresia.nivel)?.emoji}{' '}{membresia.nivel}
                  </p>
                  <p className="text-xs mt-1.5" style={{ color: '#86efac' }}>
                    Descuento: <strong style={{ color: '#f0fdf4' }}>−{fmtARS(membresia.descuento)}/kg</strong>
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: '#86efac' }}>
                    Vence el <strong style={{ color: '#f0fdf4' }}>{fmtDate(membresia.periodoFin)}</strong>
                  </p>
                </div>
                <div className="text-center shrink-0 px-4 py-3 rounded-2xl" style={{ backgroundColor: 'rgba(255,255,255,0.07)' }}>
                  <p className="text-4xl font-black tabular-nums leading-none" style={{ color: '#f0fdf4' }}>{membresia.diasRestantes}</p>
                  <p className="text-xs mt-1" style={{ color: '#86efac' }}>días vigentes</p>
                </div>
              </div>

              {/* Progreso kg hacia próximo nivel */}
              <div>
                <div className="flex justify-between text-xs mb-2" style={{ color: '#86efac' }}>
                  <span><strong style={{ color: '#f0fdf4' }}>{membresia.kgPeriodo.toFixed(1)} kg</strong> comprados este período</span>
                  {siguienteTier
                    ? <span>faltan <strong style={{ color: '#f0fdf4' }}>{(siguienteTier.min - membresia.kgPeriodo).toFixed(1)} kg</strong> para {siguienteTier.emoji} {siguienteTier.label}</span>
                    : <span style={{ color: '#fcd34d' }}>🏆 Nivel máximo</span>
                  }
                </div>
                <MembresiaProgressBar pct={Math.min(100, (membresia.kgPeriodo / TIER_MAX) * 100)} color={styles.bar} barBg={styles.barBg} />
                <div className="flex justify-between text-[10px] mt-1" style={{ color: '#86efac' }}>
                  {TIERS_MEMBRESIA.slice().reverse().map(t => (
                    <span key={t.min}>{t.emoji} {t.min} kg</span>
                  ))}
                </div>
              </div>

            </div>
          ) : (
            /* Sin membresía activa */
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="font-bold text-sm mb-2">Tu membresía</p>
              {membresia && membresia.kgPeriodo > 0 ? (
                <p className="text-sm text-muted-foreground mb-3">
                  Tenés <strong className="text-foreground">{membresia.kgPeriodo.toFixed(1)} kg</strong> acumulados.
                  Te faltan <strong className="text-foreground">{(KG_ACTIVACION - membresia.kgPeriodo).toFixed(1)} kg</strong> para activar el descuento.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground mb-3">
                  Con tu primer pedido de <strong className="text-foreground">5 kg o más</strong>, tu membresía se activa automáticamente.
                </p>
              )}
              <MembresiaProgressBar pct={Math.min(100, ((membresia?.kgPeriodo ?? 0) / KG_ACTIVACION) * 100)} color="#f59e0b" barBg="oklch(0.25 0.01 60)" />
              <div className="flex justify-between text-[10px] text-muted-foreground mb-4">
                <span>{(membresia?.kgPeriodo ?? 0).toFixed(1)} kg</span>
                <span>5 kg para activar</span>
              </div>
              <Link href="/filamentos" className="inline-flex w-full items-center justify-center gap-2 text-sm font-bold text-white rounded-xl px-5 py-2.5 hover:opacity-90 transition-opacity" style={{ backgroundColor: '#16a34a' }}>
                Ver filamentos →
              </Link>
            </div>
          )}

          {/* Niveles */}
          <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1">Niveles de descuento</p>
            {TIERS_MEMBRESIA.slice().reverse().map(t => {
              const activo = membresia?.nivel === t.label
              return (
                <div key={t.min} className={`flex items-center justify-between px-3 py-2.5 rounded-xl border ${activo ? 'border-amber-500/50 bg-amber-500/5' : 'border-border'}`}>
                  <div className="flex items-center gap-2">
                    <span>{t.emoji}</span>
                    <div>
                      <p className="text-sm font-semibold leading-none">
                        {t.emoji} {t.label}
                        {activo && <span className="ml-2 text-[10px] text-amber-500">✓ activo</span>}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{t.min} kg en 30 días</p>
                    </div>
                  </div>
                  <p className="font-black text-sm tabular-nums" style={{ color: '#16a34a' }}>−{fmtARS(t.descuento)}/kg</p>
                </div>
              )
            })}
          </div>

          {/* Aviso vencimiento próximo — discreto, al fondo */}
          {membresia?.nivel && membresia.diasRestantes <= 10 && (
            <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
              <p className="text-sm font-semibold text-foreground">⚠️ Tu membresía está próxima a finalizar</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Si no llegás a comprar <strong className="text-foreground">5 kg</strong> antes de que venza, tu membresía se desactivará.
                Recordá que podés hacer los pedidos en partes — se acumulan dentro del período activo.
              </p>
              <Link
                href="/filamentos"
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-semibold border border-border hover:bg-secondary transition-colors"
              >
                🛒 Ver filamentos y hacer un pedido →
              </Link>
              {membresia.extensionPendiente ? (
                <p className="text-xs text-center text-muted-foreground">
                  ⏳ Extensión pendiente — tus precios siguen activos mientras confirmamos.
                </p>
              ) : (
                <div className="pt-1 border-t border-border">
                  <p className="text-[11px] text-muted-foreground text-center mb-2">
                    ¿No llegás a los 5 kg? También podés extender la membresía pagando una tarifa.
                  </p>
                  <ExtensionModal nivel={membresia.nivel} diasRestantes={membresia.diasRestantes} />
                </div>
              )}
            </div>
          )}

          {/* Contacto */}
          <p className="text-xs text-center text-muted-foreground pb-2">
            ¿Dudas sobre tu membresía?{' '}
            <a href="https://wa.me/543804559909" target="_blank" rel="noopener noreferrer" className="font-semibold text-foreground underline">
              Escribinos por WhatsApp
            </a>
          </p>

        </div>
      )}

      <CoinsToast ganados={loginResult.ganados} racha={loginResult.racha} />
    </div>
  )
}
