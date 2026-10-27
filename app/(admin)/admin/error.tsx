'use client'

import { useEffect } from 'react'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Admin error boundary:', error)
  }, [error])

  return (
    <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-6">
      <h2 className="text-2xl font-bold">Error en el panel</h2>
      <p className="text-sm text-muted-foreground font-mono">{error.message}</p>
      <button
        onClick={reset}
        className="px-5 py-2.5 rounded-xl text-sm font-bold bg-foreground text-background hover:opacity-90 transition-opacity"
      >
        Reintentar
      </button>
    </div>
  )
}
