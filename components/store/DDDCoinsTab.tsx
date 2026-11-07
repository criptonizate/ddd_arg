'use client'

import { useState } from 'react'
import { Coins, Flame, ShoppingBag, Crown, User, Star, Clock, Info } from 'lucide-react'
import { PUNTOS_POR_CANJE as PUNTOS_CANJE, PESOS_POR_CANJE as PESOS_CANJE } from '@/lib/ddd-coins-helpers'

const HISTORIAL_PASO = 5

const MESES_VENCIMIENTO = 12

interface CoinRow {
  id: string
  puntos: number
  motivo: string
  created_at: string
}

interface Props {
  saldo: number
  historial: CoinRow[]
  racha: number
}

const MOTIVO_LABEL: Record<string, { label: string; icon: React.ReactNode }> = {
  login_diario:      { label: 'Login diario',          icon: <Star size={13} /> },
  racha_7:           { label: 'Racha 7 días 🔥',       icon: <Flame size={13} /> },
  racha_14:          { label: 'Racha 14 días 🔥🔥',    icon: <Flame size={13} /> },
  racha_30:          { label: 'Racha 30 días 🔥🔥🔥',  icon: <Flame size={13} /> },
  compra:            { label: 'Compra de filamentos',  icon: <ShoppingBag size={13} /> },
  membresia_mensual: { label: 'Membresía activa',      icon: <Crown size={13} /> },
  completar_perfil:  { label: 'Perfil completado',     icon: <User size={13} /> },
  canje_pedido:      { label: 'Canje en pedido',       icon: <Coins size={13} /> },
  bienvenida:        { label: '🎁 Regalo de bienvenida', icon: <Star size={13} /> },
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date)
  d.setMonth(d.getMonth() + months)
  return d
}

function fmtFecha(d: Date) {
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
}

function diasRestantes(fecha: Date): number {
  return Math.max(0, Math.ceil((fecha.getTime() - Date.now()) / 86400000))
}

export default function DDDCoinsTab({ saldo, historial, racha }: Props) {
  // Historial paginado: arrancamos mostrando 5, aumentamos de 5 en 5.
  const [mostrados, setMostrados] = useState(HISTORIAL_PASO)
  const bloques = Math.floor(saldo / PUNTOS_CANJE)
  const descuentoDisponible = bloques * PESOS_CANJE
  // "Remanente" = los pts sobrantes que todavía no alcanzan para el próximo
  // bloque. Con 550 pts: bloques = 3, remanente = 100, faltan 50 para el 4°.
  const remanente = saldo % PUNTOS_CANJE
  const progreso = Math.round((remanente / PUNTOS_CANJE) * 100)
  const puntosParaSiguiente = remanente === 0 && saldo > 0 ? 0 : PUNTOS_CANJE - remanente

  // Agrupar ganancias por mes para la línea de vencimiento.
  // Para cada mes: suma de puntos ganados ese mes + la FECHA DE VENCIMIENTO MÁS TEMPRANA
  // (= la primera ganancia del mes es la que primero vence).
  const vencimientos: { mes: string; puntos: number; venceEl: Date; diasQuedan: number }[] = []
  const porDia: Record<string, number> = {}
  for (const row of historial) {
    if (row.puntos <= 0) continue
    const fechaAR = new Date(new Date(row.created_at).getTime() - 3 * 60 * 60 * 1000)
    const clave = `${fechaAR.getUTCFullYear()}-${String(fechaAR.getUTCMonth() + 1).padStart(2, '0')}-${String(fechaAR.getUTCDate()).padStart(2, '0')}`
    porDia[clave] = (porDia[clave] ?? 0) + row.puntos
  }
  // Agrupar por mes con primera fecha de vencimiento (= mínima) determinística
  const porMes: Record<string, { puntos: number; venceEl: Date }> = {}
  for (const [clave, pts] of Object.entries(porDia)) {
    const [y, m, d] = clave.split('-').map(Number)
    const diaExacto = new Date(y, m - 1, d)
    const venceEl = addMonths(diaExacto, MESES_VENCIMIENTO)
    if (diasRestantes(venceEl) <= 0) continue
    const mesClave = `${y}-${String(m).padStart(2, '0')}`
    const existente = porMes[mesClave]
    porMes[mesClave] = {
      puntos: (existente?.puntos ?? 0) + pts,
      // Siempre guardar la MÍN fecha de vencimiento del mes (determinístico)
      venceEl: existente ? (venceEl < existente.venceEl ? venceEl : existente.venceEl) : venceEl,
    }
  }
  // Ordenar por fecha de vencimiento ascendente (los que vencen primero arriba)
  const mesesOrdenados = Object.entries(porMes)
    .sort(([, a], [, b]) => a.venceEl.getTime() - b.venceEl.getTime())
  for (const [clave, { puntos: pts, venceEl }] of mesesOrdenados) {
    const [y, m] = clave.split('-').map(Number)
    const dias = diasRestantes(venceEl)
    if (dias > 0) {
      const label = new Date(y, m - 1, 1).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
      vencimientos.push({ mes: label, puntos: pts, venceEl, diasQuedan: dias })
    }
  }

  // Aviso próximo vencimiento (< 90 días)
  const proximoVencimiento = vencimientos.find(v => v.diasQuedan <= 90)

  return (
    <div className="space-y-5">

      {/* Saldo principal — layout nuevo pensado para no confundir. En lugar
          de mostrar "100 / 150" junto a un saldo de 550, mostramos primero
          el descuento disponible como protagonista, y después "faltan X pts
          para desbloquear $1.000 más". */}
      <div className="rounded-2xl border border-border px-5 py-5" style={{ background: 'oklch(0.18 0.02 60)' }}>
        <div className="flex items-start justify-between gap-3">
          <div style={{ minWidth: 0, flex: 1 }}>
            <p className="text-xs font-semibold text-muted-foreground mb-1">Tus DDD Coins</p>
            <p className="text-3xl font-black leading-none flex items-center gap-2" style={{ color: '#f59e0b' }}>
              <span>{saldo.toLocaleString('es-AR')}</span>
              <Coins size={28} strokeWidth={2.4} aria-hidden="true" />
            </p>
            {descuentoDisponible > 0 ? (
              <div className="mt-2 inline-flex items-center gap-1.5 text-sm font-black px-3 py-1.5 rounded-xl" style={{ background: 'rgba(22,163,74,0.15)', border: '1px solid rgba(74,222,128,0.4)', color: '#4ade80' }}>
                ✓ ${descuentoDisponible.toLocaleString('es-AR')} disponibles para descontar
              </div>
            ) : (
              <p className="text-xs text-muted-foreground mt-2">
                {saldo > 0
                  ? `Te faltan ${puntosParaSiguiente} pts para tu primer $1.000 de descuento`
                  : 'Comprá o iniciá sesión cada día para empezar a acumular'}
              </p>
            )}
          </div>
          <div className="text-4xl shrink-0">🏅</div>
        </div>

        {/* Progreso hacia el PRÓXIMO bloque — solo aparece si tiene sentido
            (hay algo acumulado del bloque siguiente, o todavía no tiene nada). */}
        {(remanente > 0 || saldo === 0) && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
              <span>
                {descuentoDisponible > 0 ? 'Próximo descuento' : 'Primer descuento'}
                : <strong className="text-foreground tabular-nums">{remanente}/{PUNTOS_CANJE} pts</strong>
              </span>
              <span className="tabular-nums">Faltan {puntosParaSiguiente} pts</span>
            </div>
            <div className="h-2.5 rounded-full relative overflow-hidden" style={{ background: 'oklch(0.25 0.02 60)' }}>
              <div className="h-full rounded-full transition-all" style={{ background: '#f59e0b', width: `${progreso}%` }} />
            </div>
            <p className="text-[11px] text-muted-foreground mt-1.5 leading-snug">
              Cada {PUNTOS_CANJE} puntos equivalen a <strong className="text-foreground">${PESOS_CANJE.toLocaleString('es-AR')}</strong> de descuento en tu próximo pedido.
            </p>
          </div>
        )}
      </div>

      {/* Aviso de vencimiento próximo */}
      {proximoVencimiento && (
        <div className="rounded-xl px-4 py-3 flex items-start gap-2.5 border" style={{ background: 'oklch(0.18 0.02 30)', borderColor: proximoVencimiento.diasQuedan <= 30 ? '#ef4444' : '#d97706' }}>
          <span style={{ fontSize: '15px' }}>{proximoVencimiento.diasQuedan <= 30 ? '⚠️' : '🕐'}</span>
          <p className="text-xs leading-relaxed">
            <strong style={{ color: proximoVencimiento.diasQuedan <= 30 ? '#ef4444' : '#f59e0b' }}>
              {proximoVencimiento.puntos} pts
            </strong>
            <span className="text-muted-foreground"> vencen el </span>
            <strong className="text-foreground">{fmtFecha(proximoVencimiento.venceEl)}</strong>
            <span className="text-muted-foreground"> — usálos antes de que expiren</span>
          </p>
        </div>
      )}

      {/* Racha */}
      {racha > 0 && (
        <div className="rounded-2xl border border-border px-5 py-4 flex items-center gap-4">
          <div className="text-3xl">{racha >= 14 ? '🔥🔥' : '🔥'}</div>
          <div>
            <p className="text-sm font-bold">Racha de {racha} {racha === 1 ? 'día' : 'días'} consecutivos</p>
            <p className="text-xs text-muted-foreground">
              {racha < 7  ? `Seguí así — en ${7  - racha} ${7  - racha === 1 ? 'día' : 'días'} ganás +30 pts bonus`  :
               racha < 14 ? `¡Vas bien! En ${14 - racha} ${14 - racha === 1 ? 'día' : 'días'} ganás +75 pts bonus`  :
               racha < 30 ? `¡Increíble! En ${30 - racha} ${30 - racha === 1 ? 'día' : 'días'} ganás +200 pts bonus` :
               '¡Racha perfecta del mes! +200 pts ya sumados 🏆'}
            </p>
          </div>
        </div>
      )}

      {/* Qué son los DDD Coins */}
      <div className="rounded-2xl border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <Info size={14} className="text-muted-foreground" />
          <p className="text-sm font-bold">¿Qué son los DDD Coins?</p>
        </div>
        <div className="px-5 py-4 space-y-3">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Los <strong className="text-foreground">DDD Coins</strong> son el programa de recompensas de DDD ARG.
            Acumulás puntos por cada compra, por mantener tu membresía activa y por entrar a la app cada día.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Cada <strong className="text-foreground">150 puntos</strong> equivalen a{' '}
            <strong className="text-foreground">$1.000 de descuento</strong> en tu próximo pedido de filamentos.
            El descuento se aplica al momento de confirmar el pedido — vos elegís cuántos puntos querés usar.
          </p>
          <div className="rounded-xl px-4 py-3 text-xs text-muted-foreground space-y-1.5" style={{ background: 'oklch(0.22 0.01 60)' }}>
            <p className="flex items-center gap-1.5"><Coins size={14} className="text-amber-500 shrink-0" aria-hidden="true" /> <span><strong className="text-foreground">Comprando</strong> — 10 pts por cada kg · ≈ 15 kg para desbloquear tu primer $1.000</span></p>
            <p>📅 <strong className="text-foreground">Login diario</strong> — 5 pts por día, con bonos por racha</p>
            <p>👑 <strong className="text-foreground">Membresía activa</strong> — +50 pts al cerrar cada período de 30 días con la membresía vigente</p>
            <p>✅ <strong className="text-foreground">Perfil completo</strong> — +20 pts al cargar al menos teléfono, DNI o apodo (una sola vez)</p>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            ⏳ Los puntos <strong className="text-foreground">vencen a los 12 meses</strong> de ser ganados,
            contados desde el día en que los recibiste. Cada lote vence de forma independiente.
          </p>
        </div>
      </div>

      {/* Línea de tiempo de vencimiento */}
      {vencimientos.length > 0 && (
        <div className="rounded-2xl border border-border overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center gap-2">
            <Clock size={14} className="text-muted-foreground" />
            <p className="text-sm font-bold">Vencimiento de tus puntos</p>
          </div>
          <div className="px-5 py-4 space-y-3">
            {vencimientos.map((v, i) => {
              const urgente = v.diasQuedan <= 30
              const pronto  = v.diasQuedan <= 90
              const color   = urgente ? '#ef4444' : pronto ? '#f59e0b' : '#6b7280'
              const pct     = Math.min(100, Math.round((v.diasQuedan / 365) * 100))
              return (
                <div key={i}>
                  <div className="flex justify-between items-start gap-2 mb-1.5">
                    <div style={{ minWidth: 0 }}>
                      <span className="text-xs font-semibold capitalize block">{v.mes}</span>
                      <span className="text-xs text-muted-foreground">— {v.puntos} pts</span>
                    </div>
                    <span className="text-xs font-bold shrink-0" style={{ color }}>
                      {urgente ? '⚠️ ' : ''}{v.diasQuedan === 1 ? 'vence mañana' : `vence en ${v.diasQuedan} días`}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full" style={{ background: 'oklch(0.25 0.01 60)' }}>
                    <div className="h-1.5 rounded-full transition-all" style={{ background: color, width: `${pct}%` }} />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">{fmtFecha(v.venceEl)}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Cómo ganás puntos */}
      <div className="rounded-2xl border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <p className="text-sm font-bold">Tabla de puntos</p>
        </div>
        <div className="divide-y divide-border">
          {[
            { accion: 'Login diario',         pts: '+5 pts' },
            { accion: 'Racha de 7 días',      pts: '+30 pts bonus' },
            { accion: 'Racha de 14 días',     pts: '+75 pts bonus' },
            { accion: 'Racha de 30 días',     pts: '+200 pts bonus' },
            { accion: 'Membresía activa',     pts: '+50 pts/mes' },
            { accion: 'Compra de filamentos', pts: '+10 pts/kg' },
            { accion: 'Completar perfil',     pts: '+20 pts (una vez)' },
          ].map(r => (
            <div key={r.accion} className="flex justify-between items-center gap-2 px-5 py-3">
              <span className="text-sm text-muted-foreground">{r.accion}</span>
              <span className="text-sm font-bold shrink-0" style={{ color: '#f59e0b' }}>{r.pts}</span>
            </div>
          ))}
          <div className="flex justify-between items-center gap-2 px-5 py-3">
            <span className="text-sm text-muted-foreground">Descuento (canje)</span>
            <span className="text-sm font-bold" style={{ color: '#4ade80' }}>150 pts = $1.000</span>
          </div>
        </div>
      </div>

      {/* Historial paginado — arranca con 5 movimientos y crece de 5 en 5.
          Antes se mostraban 20 de arranque y confundía con "actividad total".
          Botón "Ver 5 más" visible mientras queden más; si ya está todo,
          se oculta. Permite colapsar de vuelta a los últimos 5. */}
      {historial.length > 0 && (
        <div className="rounded-2xl border border-border overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center justify-between">
            <p className="text-sm font-bold">Últimos movimientos</p>
            <span className="text-[10px] text-muted-foreground tabular-nums">
              {Math.min(mostrados, historial.length)} de {historial.length}
            </span>
          </div>
          <div className="divide-y divide-border">
            {historial.slice(0, mostrados).map(row => {
              const infoBase = MOTIVO_LABEL[row.motivo] ?? { label: row.motivo, icon: <Coins size={13} /> }
              const esGanancia = row.puntos > 0
              const motivoRaw = row.motivo
              const matchNumero = motivoRaw.match(/N°\s*(\d+)/i)
              const label = matchNumero && motivoRaw.startsWith('canje')
                ? `${infoBase.label} N° ${matchNumero[1]}`
                : infoBase.label
              return (
                <div key={row.id} className="flex items-center justify-between gap-2 px-5 py-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-muted-foreground shrink-0">{infoBase.icon}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{label}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(row.created_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <span className={`text-sm font-bold shrink-0 tabular-nums ${esGanancia ? '' : 'text-red-400'}`}
                    style={esGanancia ? { color: '#f59e0b' } : {}}>
                    {esGanancia ? '+' : ''}{row.puntos.toLocaleString('es-AR')} pts
                  </span>
                </div>
              )
            })}
          </div>
          {mostrados < historial.length ? (
            <button
              onClick={() => setMostrados(m => Math.min(historial.length, m + HISTORIAL_PASO))}
              className="w-full py-3 text-xs font-semibold text-muted-foreground hover:text-foreground border-t border-border transition-colors min-h-[44px] active:scale-[0.99]"
            >
              ↓ Ver {Math.min(HISTORIAL_PASO, historial.length - mostrados)} más ({historial.length - mostrados} restantes)
            </button>
          ) : mostrados > HISTORIAL_PASO ? (
            <button
              onClick={() => setMostrados(HISTORIAL_PASO)}
              className="w-full py-3 text-xs font-semibold text-muted-foreground hover:text-foreground border-t border-border transition-colors min-h-[44px] active:scale-[0.99]"
            >
              ↑ Mostrar menos
            </button>
          ) : null}
        </div>
      )}

      {historial.length === 0 && (
        <div className="rounded-2xl border border-border px-5 py-8 text-center">
          <div className="flex justify-center mb-2"><Coins size={32} className="text-amber-500" aria-hidden="true" /></div>
          <p className="text-sm font-semibold mb-1">Todavía no tenés movimientos</p>
          <p className="text-xs text-muted-foreground">Comprá filamentos o iniciá sesión cada día para empezar a acumular.</p>
        </div>
      )}
    </div>
  )
}
