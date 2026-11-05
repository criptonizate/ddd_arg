'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Gift, X } from 'lucide-react'

// Banner de bienvenida — reemplaza al modal bloqueante anterior. Aparece como
// una barra sticky arriba, dismissible con X. Pensado para que el comprador
// apurado NO tenga un modal opaco que cerrar antes de poder usar la tienda.
// Flag en localStorage para no repetir en la próxima visita.
export default function WelcomeTrialModal({
  active, diasRestantes,
}: {
  active: boolean
  diasRestantes: number
}) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!active) return
    try {
      if (localStorage.getItem('ddd_welcome_shown') === '1') return
    } catch { /* storage bloqueado: mostramos igual */ }
    const t = setTimeout(() => setOpen(true), 400)
    return () => clearTimeout(t)
  }, [active])

  function close() {
    setOpen(false)
    try { localStorage.setItem('ddd_welcome_shown', '1') } catch { /* noop */ }
  }

  if (!open) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed left-1/2 -translate-x-1/2 z-[75] w-[calc(100vw-24px)] max-w-md"
      style={{ top: 'calc(env(safe-area-inset-top, 0px) + 72px)' }}
    >
      <div
        className="rounded-2xl shadow-2xl border border-amber-500/40 overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(251,191,36,0.15), rgba(245,158,11,0.08))',
          backdropFilter: 'blur(8px)',
          boxShadow: '0 20px 50px -10px rgba(245, 158, 11, 0.35)',
        }}
      >
        <div className="flex items-start gap-3 px-4 py-3">
          <div
            className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-full"
            style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)' }}
          >
            <Gift size={18} className="text-white" aria-hidden="true" />
          </div>

          <div className="flex-1 min-w-0 space-y-0.5">
            <p className="text-sm font-black leading-tight">
              🎁 Regalo de bienvenida
            </p>
            <p className="text-xs leading-snug">
              <strong className="text-amber-500">{diasRestantes} días de prueba Plata</strong> ·
              <strong className="text-amber-500"> −$2.000/kg</strong> en todos los filamentos.{' '}
              <Link
                href="/cuenta?tab=membresia"
                onClick={close}
                className="font-semibold text-blue-500 hover:underline whitespace-nowrap"
              >
                Ver más →
              </Link>
            </p>
            <p className="text-[11px] text-muted-foreground leading-snug">
              Nivel 1 de 3 — Plata · Oro · Platino
            </p>
          </div>

          <button
            onClick={close}
            aria-label="Cerrar aviso de bienvenida"
            className="shrink-0 p-1.5 min-w-[32px] min-h-[32px] rounded-lg hover:bg-white/10 text-muted-foreground"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
