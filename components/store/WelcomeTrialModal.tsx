'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Gift, X } from 'lucide-react'

// Modal de bienvenida que aparece UNA sola vez cuando un usuario logueado tiene
// trial activo y nunca lo vio. Explica el regalo: 5 días de membresía Plata
// con -$2.000/kg en todos los filamentos.
//
// No volvemos a mostrarlo (flag en localStorage).
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
    // Pequeño delay para no pegar un modal en el mismo paint que la página.
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
      className="fixed inset-0 z-[80] bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog" aria-modal="true" aria-labelledby="welcome-title"
      onClick={close}
    >
      <div
        className="relative w-full sm:max-w-md bg-background border border-amber-500/40 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{ boxShadow: '0 25px 60px -10px rgba(245, 158, 11, 0.4)' }}
      >
        <button
          onClick={close}
          aria-label="Cerrar"
          className="absolute top-3 right-3 p-2 rounded-lg hover:bg-white/10 text-muted-foreground"
        >
          <X size={16} />
        </button>

        <div className="px-6 pt-8 pb-6 text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full"
               style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)' }}>
            <Gift size={28} className="text-white" aria-hidden="true" />
          </div>

          <div className="space-y-1.5">
            <h2 id="welcome-title" className="text-xl font-black">
              ¡Bienvenido a DDD ARG! 🎉
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Te regalamos <strong className="text-amber-500">{diasRestantes} días de membresía Plata</strong> para que pruebes la tienda.
            </p>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 space-y-2">
            <p className="text-2xl font-black text-amber-500">−$2.000 / kg</p>
            <p className="text-xs text-muted-foreground leading-snug">
              de descuento en <strong className="text-foreground">TODOS</strong> los filamentos durante tu trial.
            </p>
          </div>

          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Querés saber más sobre membresías y DDD Coins?{' '}
            <Link
              href="/cuenta?tab=membresia"
              onClick={close}
              className="font-semibold text-blue-500 hover:underline"
            >
              Ver en Mi cuenta →
            </Link>
          </p>

          <button
            onClick={close}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl py-3 text-sm transition-colors"
          >
            ¡Dale, empiezo a comprar!
          </button>
        </div>
      </div>
    </div>
  )
}
