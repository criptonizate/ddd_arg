'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import { useFocusTrap } from '@/lib/hooks/useFocusTrap'

interface State {
  message: string
  confirmLabel: string
  destructive: boolean
  resolve: (value: boolean) => void
}

export function useConfirm() {
  const [state, setState] = useState<State | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  useFocusTrap(panelRef, !!state)

  const confirm = useCallback(
    (message: string, opts?: { confirmLabel?: string; destructive?: boolean }): Promise<boolean> =>
      new Promise((resolve) => {
        setState({
          message,
          confirmLabel: opts?.confirmLabel ?? 'Confirmar',
          destructive: opts?.destructive ?? true,
          resolve,
        })
      }),
    [],
  )

  const handleResolve = useCallback((value: boolean) => {
    setState(prev => { prev?.resolve(value); return null })
  }, [])

  // Escape cierra el diálogo con cancelación
  useEffect(() => {
    if (!state) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') handleResolve(false)
    }
    window.addEventListener('keydown', onKey)
    // Bloquear scroll del body mientras el diálogo está abierto
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [state, handleResolve])

  const ConfirmDialog = state ? (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-message"
    >
      <div className="absolute inset-0 bg-black/50" onClick={() => handleResolve(false)} aria-hidden="true" />
      <div
        ref={panelRef}
        className="relative bg-card border border-border rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-5"
      >
        <div className="flex items-start gap-3">
          <div
            className={`p-2 rounded-xl shrink-0 ${state.destructive ? 'bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400' : 'bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400'}`}
            aria-hidden="true"
          >
            <AlertTriangle size={16} />
          </div>
          <p id="confirm-modal-message" className="text-sm font-medium leading-relaxed pt-1">{state.message}</p>
        </div>
        <div className="flex justify-end gap-3">
          <button
            onClick={() => handleResolve(false)}
            className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-secondary transition-colors font-medium min-h-[44px]"
          >
            Cancelar
          </button>
          <button
            onClick={() => handleResolve(true)}
            autoFocus
            className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors min-h-[44px] ${
              state.destructive
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-foreground text-primary-foreground hover:bg-foreground/90'
            }`}
          >
            {state.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  ) : null

  return { confirm, ConfirmDialog }
}
