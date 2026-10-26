'use client'

import { useState, useEffect } from 'react'
import { getDemandaFilamentos, type DemandaFilamento } from '@/lib/actions/filamentos'

const MATERIAL_COLORS: Record<string, string> = {
  PLA:  'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  PETG: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  TPU:  'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  ABS:  'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  ASA:  'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
}

function colorToCss(color: string): string {
  const c = color.toLowerCase()
  if (c.includes('black'))                            return '#1a1a1a'
  if (c.includes('white'))                            return '#f0f0f0'
  if (c.includes('grey') || c.includes('gray'))       return '#9ca3af'
  if (c.includes('vermilion') || c.includes('ruby'))  return '#c0392b'
  if (c.includes('berry') || c.includes('red'))       return '#e53e3e'
  if (c.includes('blue'))                             return '#3b82f6'
  if (c.includes('teal'))                             return '#14b8a6'
  if (c.includes('olive'))                            return '#84a830'
  if (c.includes('green'))                            return '#22c55e'
  if (c.includes('yellow') || c.includes('sunshine')) return '#eab308'
  if (c.includes('orange'))                           return '#f97316'
  if (c.includes('taro') || c.includes('purple'))     return '#a855f7'
  if (c.includes('pink'))                             return '#ec4899'
  if (c.includes('brown') || c.includes('madera'))    return '#92400e'
  if (c.includes('silk') || c.includes('gold'))       return '#d97706'
  return '#94a3b8'
}

export default function DemandaTab() {
  const [data, setData] = useState<DemandaFilamento[]>([])
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState<'score' | 'alertas' | 'carrito'>('score')
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    getDemandaFilamentos().then(d => { setData(d); setLoading(false) })
  }, [])

  const sorted = [...data].sort((a, b) => {
    if (sort === 'alertas') return b.alertas - a.alertas
    if (sort === 'carrito') return b.carrito_rollos - a.carrito_rollos
    return (b.alertas + b.carrito_rollos) - (a.alertas + a.carrito_rollos)
  })

  const totalAlertas = data.reduce((s, d) => s + d.alertas, 0)
  const totalCarritoRollos = data.reduce((s, d) => s + d.carrito_rollos, 0)

  const maxScore = sorted[0] ? sorted[0].alertas + sorted[0].carrito_rollos : 1

  if (loading) return <p className="text-sm text-muted-foreground py-8 text-center">Cargando...</p>

  if (data.length === 0) return (
    <div className="text-center py-16">
      <p className="text-4xl mb-3">📊</p>
      <p className="font-medium text-muted-foreground">Sin datos todavía</p>
      <p className="text-xs text-muted-foreground mt-1">Aparecerán cuando clientes pidan avisos o agreguen filamentos al carrito sin confirmar</p>
    </div>
  )

  return (
    <div className="space-y-5">
      {/* Resumen */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-xl px-4 py-3">
          <p className="text-xs text-muted-foreground mb-1">Avisos pendientes</p>
          <p className="text-2xl font-black">{totalAlertas}</p>
          <p className="text-[10px] text-muted-foreground">personas esperando reposición</p>
        </div>
        <div className="bg-card border border-border rounded-xl px-4 py-3">
          <p className="text-xs text-muted-foreground mb-1">Kg en carritos</p>
          <p className="text-2xl font-black">{totalCarritoRollos}</p>
          <p className="text-[10px] text-muted-foreground">sin confirmar pedido</p>
        </div>
        <div className="bg-card border border-border rounded-xl px-4 py-3 col-span-2 sm:col-span-1">
          <p className="text-xs text-muted-foreground mb-1">Filamentos con demanda</p>
          <p className="text-2xl font-black">{data.length}</p>
          <p className="text-[10px] text-muted-foreground">distintos colores/materiales</p>
        </div>
      </div>

      {/* Ordenar */}
      <div className="flex gap-2 flex-wrap items-center">
        <span className="text-xs text-muted-foreground">Ordenar por:</span>
        {([
          { value: 'score',   label: '🔥 Más necesitado' },
          { value: 'alertas', label: '🔔 Más avisos' },
          { value: 'carrito', label: '🛒 Más kg en carrito' },
        ] as { value: typeof sort; label: string }[]).map(opt => (
          <button
            key={opt.value}
            onClick={() => setSort(opt.value)}
            className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${sort === opt.value ? 'bg-foreground text-primary-foreground border-foreground' : 'border-border text-muted-foreground hover:text-foreground'}`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Lista */}
      <div className="space-y-2">
        {sorted.map((d, i) => {
          const score = d.alertas + d.carrito_rollos
          const barWidth = Math.round((score / maxScore) * 100)
          const matCls = MATERIAL_COLORS[d.material] ?? 'bg-secondary text-muted-foreground'
          const isOpen = expanded === d.filamento_id
          const hasDetail = d.alertas_lista.length > 0 || d.carrito_lista.length > 0

          return (
            <div key={d.filamento_id} className="bg-card border border-border rounded-xl overflow-hidden">
              {/* Fila principal */}
              <button
                className="w-full text-left px-4 py-3"
                onClick={() => hasDetail && setExpanded(isOpen ? null : d.filamento_id)}
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xs font-black text-muted-foreground w-5 shrink-0">#{i + 1}</span>
                  <span className="w-6 h-6 rounded-full shrink-0 border border-black/10"
                    style={{ backgroundColor: colorToCss(d.color) }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm">{d.color}</p>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${matCls}`}>
                        {d.material}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{d.marca}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {d.alertas > 0 && (
                      <span className="flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg"
                        style={{ backgroundColor: '#4c1d95', color: '#c4b5fd' }}>
                        🔔 {d.alertas}
                      </span>
                    )}
                    {d.carrito_rollos > 0 && (
                      <span className="flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg"
                        style={{ backgroundColor: 'oklch(0.24 0.06 50)', color: '#fbbf24' }}>
                        🛒 {d.carrito_rollos} kg
                      </span>
                    )}
                    {hasDetail && (
                      <span className="text-muted-foreground text-xs">{isOpen ? '▲' : '▼'}</span>
                    )}
                  </div>
                </div>

                <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'oklch(0.25 0.005 264)' }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${barWidth}%`, backgroundColor: d.alertas > d.carrito_rollos ? '#7c3aed' : '#f97316' }}
                  />
                </div>

                <div className="flex items-center gap-4 mt-1.5 text-[10px] text-muted-foreground">
                  {d.alertas > 0 && <span>🔔 {d.alertas} {d.alertas === 1 ? 'persona quiere aviso' : 'personas quieren aviso'}</span>}
                  {d.carrito_rollos > 0 && <span>🛒 {d.carrito_rollos} kg en carritos de {d.carrito_usuarios} {d.carrito_usuarios === 1 ? 'usuario' : 'usuarios'}</span>}
                  {hasDetail && !isOpen && <span className="ml-auto text-muted-foreground/60">Tocar para ver quiénes →</span>}
                </div>
              </button>

              {/* Panel expandido */}
              {isOpen && (
                <div className="border-t border-border px-4 py-3 space-y-3" style={{ backgroundColor: 'oklch(0.18 0.005 264)' }}>

                  {/* Avisos */}
                  {d.alertas_lista.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: '#c4b5fd' }}>
                        🔔 Esperando reposición
                      </p>
                      <div className="space-y-1.5">
                        {d.alertas_lista.map(u => (
                          <div key={u.user_id} className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg" style={{ backgroundColor: 'rgba(124,58,237,0.12)' }}>
                            <div>
                              <p className="text-sm font-semibold leading-none">{u.nombre}</p>
                              {u.email && <p className="text-[11px] text-muted-foreground mt-0.5">{u.email}</p>}
                            </div>
                            <a
                              href={`https://wa.me/${u.email ? '' : ''}`}
                              className="text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                              title={u.email}
                            >
                              📋
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Carrito */}
                  {d.carrito_lista.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: '#fbbf24' }}>
                        🛒 Tienen en el carrito
                      </p>
                      <div className="space-y-1.5">
                        {d.carrito_lista.map(u => (
                          <div key={u.user_id} className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg" style={{ backgroundColor: 'rgba(249,115,22,0.1)' }}>
                            <div>
                              <p className="text-sm font-semibold leading-none">{u.nombre}</p>
                              {u.email && <p className="text-[11px] text-muted-foreground mt-0.5">{u.email}</p>}
                            </div>
                            {u.rollos != null && (
                              <span className="text-xs font-bold tabular-nums" style={{ color: '#fbbf24' }}>
                                {u.rollos} kg
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
