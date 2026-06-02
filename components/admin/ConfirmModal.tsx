'use client'

import { useState, useCallback } from 'react'
import { AlertTriangle } from 'lucide-react'

interface State {
  message: string
  confirmLabel: string
  destructive: boolean
  resolve: (value: boolean) => void
}

export function useConfirm() {
  const [state, setState] = useState<State | null>(null)

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
    []
  )

  function handleResolve(value: boolean) {
    state?.resolve(value)
    setState(null)
  }

  const ConfirmDialog = state ? (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={() => handleResolve(false)} />
      <div className="relative bg-card border border-border rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-5">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-xl shrink-0 ${state.destructive ? 'bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400' : 'bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400'}`}>
            <AlertTriangle size={16} />
          </div>
          <p className="text-sm font-medium leading-relaxed pt-1">{state.message}</p>
        </div>
        <div className="flex justify-end gap-3">
          <button
            onClick={() => handleResolve(false)}
            className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-secondary transition-colors font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={() => handleResolve(true)}
            className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${
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
