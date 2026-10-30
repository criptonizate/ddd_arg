'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import type { FilamentoPedido, FilamentoPedidoItem } from '@/lib/actions/filamento-pedidos'
import { cancelarMiPedido } from '@/lib/actions/filamento-pedidos'
import type { VentaFilamento } from '@/lib/filamentos-helpers'
import Link from 'next/link'
import { Clock, CheckCircle2, XCircle, Truck, AlertTriangle } from 'lucide-react'

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

function useNow(intervalMs = 30000) {
  // null en SSR + primera render para evitar hydration mismatch (server time != client time).
  // El consumidor debe tolerar null (ej: mostrar placeholder).
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    setNow(Date.now())
    const t = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(t)
  }, [intervalMs])
  return now
}

function CountdownReserva({ reservadoHasta }: { reservadoHasta: string }) {
  const now = useNow(60000)
  if (now === null) return null // SSR / primer render — evita mismatch
  const ms = new Date(reservadoHasta).getTime() - now
  if (ms <= 0) return <span className="text-red-500 font-semibold text-[11px]">⚠ Reserva vencida</span>
  const horas = Math.floor(ms / 3600000)
  const min = Math.floor((ms % 3600000) / 60000)
  const texto = horas > 0 ? `${horas}h ${min}m` : `${min} min`
  return (
    <span className={`text-[11px] font-semibold flex items-center gap-1 ${horas < 1 ? 'text-orange-500' : 'text-muted-foreground'}`}>
      <Clock size={10} />
      Stock reservado por {texto}
    </span>
  )
}

export default function CuentaPedidosTab({
  pedidos: initialPedidos,
  ventasHistoricas,
  userId,
}: {
  pedidos: FilamentoPedido[]
  ventasHistoricas: VentaFilamento[]
  userId: string
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [cancelando, setCancelando] = useState<string | null>(null)
  const [cancelError, setCancelError] = useState<Record<string, string>>({})
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null)

  // Item 3 — Realtime: re-render cuando cambia el estado de un pedido
  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const channel = supabase
      .channel('cuenta_pedidos')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'filamento_pedidos',
        filter: `user_id=eq.${userId}`,
      }, () => {
        router.refresh()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId, router])

  function pedirConfirmacionCancelar(pedidoId: string) {
    setConfirmCancelId(pedidoId)
  }

  function ejecutarCancelacion() {
    const pedidoId = confirmCancelId
    if (!pedidoId) return
    setConfirmCancelId(null)
    setCancelando(pedidoId)
    setCancelError(prev => { const n = { ...prev }; delete n[pedidoId]; return n })
    startTransition(async () => {
      const result = await cancelarMiPedido(pedidoId)
      setCancelando(null)
      if (result.error) {
        setCancelError(prev => ({ ...prev, [pedidoId]: result.error! }))
      } else {
        router.refresh()
      }
    })
  }

  return (
    <>
      {!initialPedidos?.length ? (
        <div className="text-center py-16 bg-secondary/20 rounded-2xl border border-border px-4">
          <p className="text-4xl mb-3">🎨</p>
          <p className="font-medium text-muted-foreground">Todavía no hiciste ningún pedido</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 mt-5">
            <Link href="/filamentos" className="inline-flex items-center gap-1.5 text-sm font-medium bg-foreground text-background rounded-xl px-5 py-2.5 hover:opacity-90 transition-opacity min-h-[44px]">
              Ver filamentos disponibles →
            </Link>
            <Link href="/cuenta?tab=colores" className="inline-flex items-center gap-1.5 text-sm font-medium border border-border text-foreground rounded-xl px-5 py-2.5 hover:bg-secondary transition-colors min-h-[44px]">
              ¿No encontrás tu color? Pedilo
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {initialPedidos.map(p => {
            const cfg = ESTADO_CONFIG[p.estado] ?? ESTADO_CONFIG.pendiente
            const Icon = cfg.icon
            const esPendiente = p.estado === 'pendiente'
            return (
              <div key={p.id} className="bg-card border border-border rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-bold text-sm shrink-0">N° {p.numero}</span>
                    <span className="text-xs text-muted-foreground shrink-0">{fmtDate(p.created_at)}</span>
                  </div>
                  <span className={`shrink-0 flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ml-2 ${cfg.cls}`}>
                    <Icon size={11} />
                    {cfg.label}
                  </span>
                </div>

                {/* Item 2 — Countdown de reserva para pedidos pendientes */}
                {esPendiente && p.reservado_hasta && (
                  <div className="px-5 py-2 border-b border-border bg-yellow-50/5">
                    <CountdownReserva reservadoHasta={p.reservado_hasta} />
                  </div>
                )}

                <div className="px-5 py-3 space-y-3">
                  {p.items.map((item: FilamentoPedidoItem, i: number) => {
                    const precioBase = item.precio_unitario
                    const precioFinal = Math.max(0, item.precio_unitario - p.descuento_por_rollo)
                    const subtotalItem = item.rollos * precioFinal
                    return (
                      <div key={i} className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">
                            {item.rollos} kg · {item.color}
                          </p>
                          <p className="text-xs text-muted-foreground">{item.material} — {item.marca}</p>
                          {p.descuento_por_rollo > 0 ? (
                            <p className="text-xs mt-0.5">
                              <span className="line-through text-muted-foreground">{fmtARS(precioBase)}/kg</span>
                              <span className="ml-1.5 font-semibold" style={{ color: '#22c55e' }}>
                                − {fmtARS(p.descuento_por_rollo)}/kg
                              </span>
                              <span className="ml-1.5 font-bold text-foreground">{fmtARS(precioFinal)}/kg</span>
                            </p>
                          ) : (
                            <p className="text-xs mt-0.5 text-muted-foreground">{fmtARS(precioFinal)}/kg</p>
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

                {/* WhatsApp reminder for pending orders */}
                {esPendiente && (() => {
                  const itemLines = p.items.map((i: FilamentoPedidoItem) =>
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
                    <div className="px-5 py-3 border-t border-border flex flex-wrap items-center gap-2">
                      <a
                        href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '543804559909'}?text=${encodeURIComponent(msg)}`}
                        target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-xs font-semibold px-3.5 py-2 rounded-xl bg-[#25D366]/10 text-[#128C7E] dark:text-[#25D366] border border-[#25D366]/30 hover:bg-[#25D366]/20 transition-colors"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                          <path d="M11.999 2C6.477 2 2 6.477 2 12c0 1.936.53 3.744 1.452 5.29L2.046 22l4.799-1.396A9.956 9.956 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 11.999 2zm.001 18a7.96 7.96 0 01-4.073-1.117l-.291-.174-3.028.881.86-3.105-.19-.3A7.96 7.96 0 014 12c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8-8 8z"/>
                        </svg>
                        Recordatorio por WhatsApp
                      </a>

                      <button
                        onClick={() => pedirConfirmacionCancelar(p.id)}
                        disabled={cancelando === p.id}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                      >
                        <XCircle size={12} />
                        {cancelando === p.id ? 'Cancelando…' : 'Cancelar pedido'}
                      </button>
                    </div>
                  )
                })()}

                {cancelError[p.id] && (
                  <div className="px-5 py-2 text-xs text-red-600 flex items-center gap-1.5 border-t border-border">
                    <AlertTriangle size={12} />
                    {cancelError[p.id]}
                  </div>
                )}

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

      {/* Modal custom de confirmación — reemplaza window.confirm que no
          mostraba qué pedido se cancelaba. */}
      {confirmCancelId && (() => {
        const pedido = initialPedidos?.find(p => p.id === confirmCancelId)
        if (!pedido) return null
        return (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-cancel-title"
            className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-4"
            onClick={() => setConfirmCancelId(null)}
          >
            <div
              className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="px-5 py-4 border-b border-border">
                <h3 id="confirm-cancel-title" className="font-bold text-base">¿Cancelar pedido N°{pedido.numero}?</h3>
                <p className="text-xs text-muted-foreground mt-1">{pedido.total_rollos} kg · {fmtARS(pedido.total)}</p>
              </div>
              <div className="px-5 py-4">
                <p className="text-sm text-muted-foreground">
                  Vamos a liberar la reserva de stock. Si tenías DDD Coins canjeados o puntos ganados por este pedido, se devuelven. Esta acción no se puede deshacer.
                </p>
              </div>
              <div className="px-5 pb-5 flex gap-2">
                <button
                  onClick={() => setConfirmCancelId(null)}
                  className="flex-1 min-h-[44px] px-4 rounded-xl border border-border hover:bg-secondary text-sm font-semibold"
                >
                  No, mantener
                </button>
                <button
                  onClick={ejecutarCancelacion}
                  className="flex-1 min-h-[44px] px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold"
                >
                  Sí, cancelar
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </>
  )
}
