'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Store error boundary:', error)
  }, [error])

  return (
    <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-6">
      <div className="text-6xl">🫠</div>
      <div>
        <h2 className="text-2xl font-bold mb-2">Algo salió mal</h2>
        <p className="text-sm text-muted-foreground">
          Tuvimos un problema cargando esta página. Probá reintentar o volver al inicio.
        </p>
      </div>
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={reset}
          className="px-5 py-2.5 rounded-xl text-sm font-bold bg-foreground text-background hover:opacity-90 transition-opacity"
        >
          Reintentar
        </button>
        <Link
          href="/"
          className="px-5 py-2.5 rounded-xl text-sm font-bold border border-border hover:bg-secondary transition-colors"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  )
}
