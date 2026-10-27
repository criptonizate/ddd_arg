'use client'

import { Coins, Flame, ShoppingBag, Crown, User, Star } from 'lucide-react'

const PUNTOS_CANJE = 150
const PESOS_CANJE = 1000

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

export default function DDDCoinsTab({ saldo, historial, racha }: Props) {
  const bloques = Math.floor(saldo / PUNTOS_CANJE)
  const descuentoDisponible = bloques * PESOS_CANJE
  const puntosParaSiguiente = saldo % PUNTOS_CANJE === 0 && saldo > 0 ? 0 : PUNTOS_CANJE - (saldo % PUNTOS_CANJE)
  const progreso = Math.round(((saldo % PUNTOS_CANJE) / PUNTOS_CANJE) * 100)

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
                {puntosParaSiguiente > 0
                  ? `Te faltan ${puntosParaSiguiente} pts para tu primer descuento`
                  : 'Empezá a ganar puntos comprando o iniciando sesión cada día'}
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
            <div
              className="h-2 rounded-full transition-all"
              style={{ background: '#f59e0b', width: `${progreso}%` }}
            />
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
              {racha < 7
                ? `Seguí así — en ${7 - racha} ${7 - racha === 1 ? 'día' : 'días'} ganás +30 pts bonus`
                : racha < 14
                ? `¡Vas bien! En ${14 - racha} ${14 - racha === 1 ? 'día' : 'días'} ganás +75 pts bonus`
                : racha < 30
                ? `¡Increíble! En ${30 - racha} ${30 - racha === 1 ? 'día' : 'días'} ganás +200 pts bonus`
                : '¡Racha perfecta del mes! +200 pts ya sumados 🏆'}
            </p>
          </div>
        </div>
      )}

      {/* Cómo ganás puntos */}
      <div className="rounded-2xl border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <p className="text-sm font-bold">Cómo ganás DDD Coins</p>
        </div>
        <div className="divide-y divide-border">
          {[
            { accion: 'Login diario', pts: '+5 pts' },
            { accion: 'Racha de 7 días', pts: '+30 pts bonus' },
            { accion: 'Racha de 14 días', pts: '+75 pts bonus' },
            { accion: 'Racha de 30 días', pts: '+200 pts bonus' },
            { accion: 'Membresía activa', pts: '+50 pts/mes' },
            { accion: 'Compra de filamentos', pts: '+10 pts/rollo' },
            { accion: 'Completar perfil', pts: '+20 pts (una vez)' },
          ].map(r => (
            <div key={r.accion} className="flex justify-between items-center px-5 py-3">
              <span className="text-sm text-muted-foreground">{r.accion}</span>
              <span className="text-sm font-bold" style={{ color: '#f59e0b' }}>{r.pts}</span>
            </div>
          ))}
          <div className="flex justify-between items-center px-5 py-3">
            <span className="text-sm text-muted-foreground">Canje (descuento en filamentos)</span>
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
                  <span
                    className={`text-sm font-bold ${!esGanancia ? 'text-red-400' : ''}`}
                    style={esGanancia ? { color: '#f59e0b' } : {}}
                  >
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
