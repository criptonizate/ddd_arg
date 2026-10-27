'use client'

import { Coins, Flame, ShoppingBag, Crown, User, Star, Clock, Info } from 'lucide-react'

const PUNTOS_CANJE = 150
const PESOS_CANJE = 1000
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
  const bloques = Math.floor(saldo / PUNTOS_CANJE)
  const descuentoDisponible = bloques * PESOS_CANJE
  const progreso = Math.round(((saldo % PUNTOS_CANJE) / PUNTOS_CANJE) * 100)
  const puntosParaSiguiente = saldo % PUNTOS_CANJE === 0 && saldo > 0 ? 0 : PUNTOS_CANJE - (saldo % PUNTOS_CANJE)

  // Agrupar ganancias por mes para la línea de vencimiento
  const vencimientos: { mes: string; puntos: number; venceEl: Date; diasQuedan: number }[] = []
  const porMes: Record<string, number> = {}
  for (const row of historial) {
    if (row.puntos <= 0) continue
    const fecha = new Date(row.created_at)
    const clave = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`
    porMes[clave] = (porMes[clave] ?? 0) + row.puntos
  }
  for (const [clave, pts] of Object.entries(porMes).sort()) {
    const [y, m] = clave.split('-').map(Number)
    const primerDiaMes = new Date(y, m - 1, 1)
    const venceEl = addMonths(primerDiaMes, MESES_VENCIMIENTO)
    const dias = diasRestantes(venceEl)
    if (dias > 0) {
      const label = primerDiaMes.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
      vencimientos.push({ mes: label, puntos: pts, venceEl, diasQuedan: dias })
    }
  }

  return (
    <div className="space-y-5">

      {/* Saldo principal */}
      <div className="rounded-2xl border border-border px-5 py-5" style={{ background: 'oklch(0.18 0.02 60)' }}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1">Tus DDD Coins</p>
            <p className="text-4xl font-black" style={{ color: '#f59e0b' }}>
              {saldo.toLocaleString('es-AR')} <span className="text-2xl">🪙</span>
            </p>
            {descuentoDisponible > 0 ? (
              <p className="text-sm font-semibold mt-1" style={{ color: '#4ade80' }}>
                = ${descuentoDisponible.toLocaleString('es-AR')} de descuento disponible
              </p>
            ) : (
              <p className="text-xs text-muted-foreground mt-1">
                {puntosParaSiguiente > 0 && saldo > 0
                  ? `Te faltan ${puntosParaSiguiente} pts para tu primer descuento`
                  : 'Comprá o iniciá sesión cada día para acumular'}
              </p>
            )}
          </div>
          <div className="text-4xl">🏅</div>
        </div>

        <div className="mt-4">
          <div className="flex justify-between text-[10px] text-muted-foreground mb-1.5">
            <span>{saldo % PUNTOS_CANJE} / {PUNTOS_CANJE} pts para el próximo $1.000</span>
            <span>{progreso}%</span>
          </div>
          <div className="h-2 rounded-full" style={{ background: 'oklch(0.25 0.02 60)' }}>
            <div className="h-2 rounded-full transition-all" style={{ background: '#f59e0b', width: `${progreso}%` }} />
          </div>
        </div>
      </div>

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
          <div className="rounded-xl px-4 py-3 text-xs text-muted-foreground space-y-1" style={{ background: 'oklch(0.22 0.01 60)' }}>
            <p>🪙 <strong className="text-foreground">Comprando</strong> — ganás 10 pts por cada kg de filamento</p>
            <p>📅 <strong className="text-foreground">Login diario</strong> — 5 pts por día, con bonos por racha</p>
            <p>👑 <strong className="text-foreground">Membresía activa</strong> — 50 pts extra por mes</p>
            <p>✅ <strong className="text-foreground">Perfil completo</strong> — 20 pts al completar tus datos</p>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            ⏳ Los puntos <strong className="text-foreground">vencen a los 12 meses</strong> de ser ganados.
            Usándolos o ganando nuevos puntos mantenés activo tu saldo.
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
                  <div className="flex justify-between items-center mb-1.5">
                    <div>
                      <span className="text-xs font-semibold capitalize">{v.mes}</span>
                      <span className="text-xs text-muted-foreground ml-2">— {v.puntos} pts</span>
                    </div>
                    <span className="text-xs font-bold" style={{ color }}>
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
            <div key={r.accion} className="flex justify-between items-center px-5 py-3">
              <span className="text-sm text-muted-foreground">{r.accion}</span>
              <span className="text-sm font-bold" style={{ color: '#f59e0b' }}>{r.pts}</span>
            </div>
          ))}
          <div className="flex justify-between items-center px-5 py-3">
            <span className="text-sm text-muted-foreground">Descuento (canje)</span>
            <span className="text-sm font-bold" style={{ color: '#4ade80' }}>150 pts = $1.000</span>
          </div>
        </div>
      </div>

      {/* Historial */}
      {historial.length > 0 && (
        <div className="rounded-2xl border border-border overflow-hidden">
          <div className="px-5 py-3 border-b border-border">
            <p className="text-sm font-bold">Historial reciente</p>
          </div>
          <div className="divide-y divide-border">
            {historial.map(row => {
              const info = MOTIVO_LABEL[row.motivo] ?? { label: row.motivo, icon: <Coins size={13} /> }
              const esGanancia = row.puntos > 0
              return (
                <div key={row.id} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-muted-foreground">{info.icon}</span>
                    <div>
                      <p className="text-sm font-medium">{info.label}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(row.created_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <span className={`text-sm font-bold ${!esGanancia ? 'text-red-400' : ''}`}
                    style={esGanancia ? { color: '#f59e0b' } : {}}>
                    {esGanancia ? '+' : ''}{row.puntos} pts
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {historial.length === 0 && (
        <div className="rounded-2xl border border-border px-5 py-8 text-center">
          <p className="text-3xl mb-2">🪙</p>
          <p className="text-sm font-semibold mb-1">Todavía no tenés movimientos</p>
          <p className="text-xs text-muted-foreground">Comprá filamentos o iniciá sesión cada día para empezar a acumular.</p>
        </div>
      )}
    </div>
  )
}
