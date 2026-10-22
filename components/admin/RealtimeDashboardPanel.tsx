'use client'

import { useEffect, useState, useCallback } from 'react'
import { RefreshCw } from 'lucide-react'
import { getRealtimePanelData, type RealtimePanelData } from '@/lib/actions/realtime-dashboard'

const REFRESH_INTERVAL = 15000

function Tile({ label, value, color, pulse }: { label: string; value: number; color: string; pulse?: boolean }) {
  return (
    <div className={`flex flex-col items-center justify-center rounded-xl border p-4 gap-1 ${color}`}>
      <span className={`text-3xl font-black tabular-nums ${pulse && value > 0 ? 'animate-pulse' : ''}`}>{value}</span>
      <span className="text-[11px] text-center font-medium leading-tight opacity-80">{label}</span>
    </div>
  )
}

export default function RealtimeDashboardPanel() {
  const [data, setData] = useState<RealtimePanelData | null>(null)
  const [loading, setLoading] = useState(true)
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)

  const fetch = useCallback(async () => {
    const d = await getRealtimePanelData()
    setData(d)
    setUpdatedAt(new Date())
    setLoading(false)
  }, [])

  useEffect(() => {
    fetch()
    const id = setInterval(fetch, REFRESH_INTERVAL)
    return () => clearInterval(id)
  }, [fetch])

  function fmtAgo(date: Date | null) {
    if (!date) return ''
    const s = Math.round((Date.now() - date.getTime()) / 1000)
    if (s < 5) return 'ahora mismo'
    if (s < 60) return `hace ${s}s`
    return `hace ${Math.round(s / 60)}min`
  }

  const [tick, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 5000)
    return () => clearInterval(id)
  }, [])
  void tick

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-2xl p-6 animate-pulse">
        <div className="h-4 bg-secondary rounded w-40 mb-4" />
        <div className="grid grid-cols-4 gap-3">
          {[...Array(8)].map((_, i) => <div key={i} className="h-20 bg-secondary rounded-xl" />)}
        </div>
      </div>
    )
  }

  if (!data) return null

  const totalPendientesWeb = data.filamentoPedidosPendientes + data.insumoPedidosPendientes
  const totalCarritoKg = data.carritoItems.reduce((s, i) => s + i.totalKg, 0)

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-sm font-bold">Panel en tiempo real</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-muted-foreground">{fmtAgo(updatedAt)}</span>
          <button
            onClick={fetch}
            className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground transition-colors"
            title="Actualizar ahora"
          >
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      <div className="p-5 space-y-5">

        {/* Pedidos físicos */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">🖨️ Pedidos del local</p>
          <div className="grid grid-cols-4 gap-2">
            <Tile label="Pendientes" value={data.ordenesPendiente} pulse color="bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-700 dark:text-yellow-200" />
            <Tile label="Confirmados" value={data.ordenesConfirmada} color="bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-700 dark:text-blue-200" />
            <Tile label="Imprimiendo" value={data.ordenesImprimiendo} color="bg-violet-50 border-violet-200 text-violet-800 dark:bg-violet-900/20 dark:border-violet-700 dark:text-violet-200" />
            <Tile label="Listos" value={data.ordenesListo} color="bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-700 dark:text-green-200" />
          </div>
        </div>

        {/* Pedidos web + cuentas */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">🌐 Pedidos web</p>
            <div className="grid grid-cols-2 gap-2">
              <Tile label="Filamentos pendientes" value={data.filamentoPedidosPendientes} pulse={data.filamentoPedidosPendientes > 0} color={data.filamentoPedidosPendientes > 0 ? "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-700 dark:text-amber-200" : "bg-card border-border text-foreground"} />
              <Tile label="Insumos pendientes" value={data.insumoPedidosPendientes} pulse={data.insumoPedidosPendientes > 0} color={data.insumoPedidosPendientes > 0 ? "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-700 dark:text-amber-200" : "bg-card border-border text-foreground"} />
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">👤 Cuentas</p>
            <div className="grid grid-cols-2 gap-2">
              <Tile label="Nuevas esta semana" value={data.cuentasNuevas} color="bg-purple-50 border-purple-200 text-purple-800 dark:bg-purple-900/20 dark:border-purple-700 dark:text-purple-200" />
              <Tile label="Alertas de stock" value={data.alertasStock} color={data.alertasStock > 0 ? "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-700 dark:text-red-200" : "bg-card border-border text-foreground"} />
            </div>
          </div>
        </div>

        {/* Carritos activos */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              🛒 En carritos ahora
            </p>
            {totalCarritoKg > 0 && (
              <span className="text-[11px] text-muted-foreground">{totalCarritoKg.toFixed(1)} kg totales · {data.carritoItems.reduce((s, i) => s + i.totalUsuarios, 0)} usuario{data.carritoItems.reduce((s, i) => s + i.totalUsuarios, 0) !== 1 ? 's' : ''}</span>
            )}
          </div>
          {data.carritoItems.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-3 bg-secondary/30 rounded-xl">
              Ningún carrito activo en este momento
            </p>
          ) : (
            <div className="space-y-1.5">
              {data.carritoItems.map(item => (
                <div key={item.filamento_id} className="flex items-center gap-3 bg-secondary/30 rounded-lg px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium">{item.color}</span>
                    <span className="text-xs text-muted-foreground ml-1.5">{item.material} · {item.marca}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground">{item.totalUsuarios} usuario{item.totalUsuarios !== 1 ? 's' : ''}</span>
                    <span className="text-sm font-bold tabular-nums">{item.totalKg.toFixed(1)} kg</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {totalPendientesWeb > 0 && (
          <div className="flex items-center gap-2 px-3 py-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl text-sm font-medium text-amber-800 dark:text-amber-200">
            ⚠️ Tenés {totalPendientesWeb} pedido{totalPendientesWeb !== 1 ? 's' : ''} web pendiente{totalPendientesWeb !== 1 ? 's' : ''} de revisar
          </div>
        )}
      </div>
    </div>
  )
}
