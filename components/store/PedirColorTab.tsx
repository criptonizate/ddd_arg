'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import { Palette, Check, Clock, Sparkles, Trash2, Bell } from 'lucide-react'
import type { FilamentoSugerencia } from '@/lib/actions/filamentos'
import { pedirColor, borrarMiSugerencia, marcarSugerenciasVistas } from '@/lib/actions/filamentos'

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function PedirColorTab({ sugerencias: initial }: { sugerencias: FilamentoSugerencia[] }) {
  const [sugerencias, setSugerencias] = useState(initial)
  const [color, setColor] = useState('')
  const [nota, setNota] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enviado, setEnviado] = useState(false)
  const [pending, startTransition] = useTransition()
  const marcadoRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync cuando el servidor devuelve datos nuevos (ej: router.refresh)
  useEffect(() => {
    setSugerencias(initial)
  }, [initial])

  // Marcar como vistas UNA VEZ al montar si hay notificaciones nuevas
  useEffect(() => {
    if (marcadoRef.current) return
    const hayNotificadas = initial.some(s => s.estado === 'notificado' && !s.visto_por_cliente)
    if (!hayNotificadas) return
    marcadoRef.current = true
    marcarSugerenciasVistas()
      .then(() => {
        setSugerencias(prev => prev.map(s =>
          s.estado === 'notificado' && !s.visto_por_cliente ? { ...s, visto_por_cliente: true } : s
        ))
      })
      .catch(() => {})
  }, [initial])

  // Cleanup del timeout al unmount
  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current)
  }, [])

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!color.trim()) {
      setError('Indicá qué color necesitás')
      return
    }
    startTransition(async () => {
      const res = await pedirColor({ color: color.trim(), nota: nota.trim() })
      if (res.error) {
        setError(res.error)
        return
      }
      // Optimista: agregar al tope
      setSugerencias(prev => [
        {
          id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `temp-${Date.now()}-${Math.random()}`,
          user_id: null,
          nombre_usuario: '',
          mensaje: nota.trim() ? `Pedido de color: ${color.trim()}. ${nota.trim()}` : `Pedido de color: ${color.trim()}`,
          color: color.trim(),
          nota: nota.trim() || null,
          estado: 'pendiente',
          respondido_at: null,
          visto_por_cliente: false,
          created_at: new Date().toISOString(),
          leido: false,
        },
        ...prev,
      ])
      setColor('')
      setNota('')
      setEnviado(true)
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setEnviado(false), 3000)
    })
  }

  async function onBorrar(id: string, colorName: string) {
    if (!confirm(`¿Borrar el pedido del color "${colorName}"?`)) return
    const prev = sugerencias
    setSugerencias(s => s.filter(x => x.id !== id))
    const res = await borrarMiSugerencia(id)
    if (res.error) {
      setSugerencias(prev)
      alert(res.error)
    }
  }

  // Helpers para extraer título y nota — prefiere columnas estructuradas, fallback a parsear mensaje legacy
  function tituloSugerencia(s: FilamentoSugerencia): string {
    if (s.color) return s.color
    // Legacy: sugerencia enviada antes de la columna color (desde /filamentos)
    return s.mensaje.length > 60 ? s.mensaje.slice(0, 60).trim() + '…' : s.mensaje
  }
  function notaSugerencia(s: FilamentoSugerencia): string | null {
    if (s.nota) return s.nota
    // Legacy fallback: extraer nota del mensaje si viene con formato viejo "Pedido de color: X. Y"
    if (s.color && s.mensaje.startsWith('Pedido de color:')) {
      const idx = s.mensaje.indexOf('. ')
      if (idx > 0) return s.mensaje.substring(idx + 2).trim() || null
      return null
    }
    // Mensaje libre sin color estructurado — no duplicar como nota si ya es el título
    if (!s.color) return null
    return null
  }

  return (
    <div className="space-y-6">
      {/* Formulario */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'oklch(0.22 0.04 300)' }}>
            <Palette size={18} style={{ color: '#c084fc' }} />
          </div>
          <div>
            <h2 className="font-bold text-base">Pedí un color</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              ¿Hay un color que te hace falta y no está en la tienda? Pedilo acá y te aviso cuando lo reponga.
            </p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-semibold block mb-1.5" htmlFor="pedir-color-color">Color</label>
            <input
              id="pedir-color-color"
              type="text"
              value={color}
              onChange={e => setColor(e.target.value)}
              placeholder="Ej: Violeta pastel, Negro mate, Verde flúor..."
              maxLength={120}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-violet-400"
              disabled={pending}
            />
          </div>
          <div>
            <label className="text-xs font-semibold block mb-1.5" htmlFor="pedir-color-nota">
              Nota <span className="text-muted-foreground font-normal">(opcional)</span>
            </label>
            <textarea
              id="pedir-color-nota"
              value={nota}
              onChange={e => setNota(e.target.value)}
              placeholder="Marca preferida, material (PLA/PETG/ABS), cuánto necesitás..."
              rows={2}
              maxLength={500}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-400"
              disabled={pending}
            />
            {nota.length > 400 && (
              <p className="text-[10px] text-muted-foreground mt-1 text-right">{nota.length}/500</p>
            )}
          </div>
          {error && <p className="text-xs text-red-500" role="alert">{error}</p>}
          {enviado && (
            <p className="text-xs font-semibold text-green-600 dark:text-green-400 flex items-center gap-1" role="status" aria-live="polite">
              <Check size={13} /> Pedido enviado. Te aviso cuando lo tenga.
            </p>
          )}
          <button
            type="submit"
            disabled={pending || !color.trim()}
            className="w-full bg-violet-500 hover:bg-violet-600 disabled:opacity-50 text-white font-semibold text-sm py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 min-h-[44px]"
          >
            {pending ? 'Enviando...' : <>Enviar pedido <Palette size={14} /></>}
          </button>
        </form>
      </div>

      {/* Historial */}
      {sugerencias.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">Tus pedidos</p>
          <ul className="space-y-2">
            {sugerencias.map(s => {
              const notificado = s.estado === 'notificado'
              const descartado = s.estado === 'descartado'
              const titulo = tituloSugerencia(s)
              const nota = notaSugerencia(s)
              return (
                <li
                  key={s.id}
                  className={`flex items-start justify-between gap-3 px-3 py-3 rounded-xl border ${
                    notificado
                      ? 'border-green-500/40 bg-green-500/5'
                      : descartado
                        ? 'border-border bg-secondary/30 opacity-70'
                        : 'border-border'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm break-words max-w-full">{titulo}</p>
                      {notificado && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-500/20 text-green-600 dark:text-green-400 border border-green-500/40 shrink-0">
                          <Sparkles size={10} /> ¡Ya hay stock!
                        </span>
                      )}
                      {!notificado && !descartado && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 shrink-0">
                          <Clock size={10} /> Pendiente
                        </span>
                      )}
                      {descartado && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border shrink-0">
                          No disponible
                        </span>
                      )}
                    </div>
                    {nota && (
                      <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap break-words">{nota}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {fmtDate(s.created_at)}
                      {notificado && s.respondido_at && ` · avisado el ${fmtDate(s.respondido_at)}`}
                    </p>
                    {notificado && (
                      <a
                        href="/filamentos"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-green-600 dark:text-green-400 hover:underline mt-1.5"
                      >
                        <Bell size={11} /> Ver en la tienda →
                      </a>
                    )}
                  </div>
                  {s.estado === 'pendiente' && (
                    <button
                      onClick={() => onBorrar(s.id, titulo)}
                      className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors shrink-0"
                      aria-label={`Borrar pedido del color ${titulo}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
