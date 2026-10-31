'use client'

import { createContext, useContext, useState, useCallback, useId } from 'react'
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react'

interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
}

interface ToastCtx {
  toast: (message: string, type?: Toast['type']) => void
}

const Ctx = createContext<ToastCtx>({ toast: () => {} })

export function useToast() {
  return useContext(Ctx)
}

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = Math.random().toString(36).slice(2, 9)
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500)
  }, [])

  function dismiss(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <div
        role="region"
        aria-label="Notificaciones"
        aria-live="polite"
        aria-atomic="false"
        className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.type === 'error' ? 'alert' : 'status'}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium pointer-events-auto max-w-sm transition-all duration-200 ${
              t.type === 'success'
                ? 'bg-green-600 text-white'
                : t.type === 'error'
                ? 'bg-red-600 text-white'
                : 'bg-foreground text-primary-foreground'
            }`}
          >
            {t.type === 'success' && <CheckCircle size={15} className="shrink-0" aria-hidden="true" />}
            {t.type === 'error' && <AlertCircle size={15} className="shrink-0" aria-hidden="true" />}
            {t.type === 'info' && <Info size={15} className="shrink-0" aria-hidden="true" />}
            <span className="flex-1">{t.message}</span>
            <button
              onClick={() => dismiss(t.id)}
              aria-label="Cerrar notificación"
              className="opacity-70 hover:opacity-100 transition-opacity min-w-[32px] min-h-[32px] flex items-center justify-center"
            >
              <X size={13} aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}
