'use client'

import { useState, useTransition } from 'react'
import { createNegocio } from '@/lib/actions/negocios'
import { Plus, X } from 'lucide-react'

export default function NuevoNegocioButton() {
  const [open, setOpen] = useState(false)
  const [nombre, setNombre] = useState('')
  const [contacto, setContacto] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit() {
    setError(null)
    if (!nombre.trim()) { setError('El nombre es obligatorio'); return }
    startTransition(async () => {
      const res = await createNegocio({ nombre, contacto })
      if (res?.error) { setError(res.error); return }
      setOpen(false)
      setNombre('')
      setContacto('')
    })
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 bg-foreground text-primary-foreground hover:bg-foreground/90 transition-colors rounded-lg px-4 py-2 text-sm font-medium"
      >
        <Plus size={16} /> Agregar negocio
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative bg-card rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-lg font-semibold">🏪 Nuevo negocio</h2>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-secondary">
                <X size={16} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {error && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm text-destructive">
                  {error}
                </div>
              )}
              <div>
                <label className="text-xs font-medium mb-1 block">Nombre del negocio *</label>
                <input
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Ej: Esquina 24"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Contacto (opcional)</label>
                <input
                  value={contacto}
                  onChange={(e) => setContacto(e.target.value)}
                  className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Teléfono, nombre, etc."
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-border">
              <button
                onClick={() => setOpen(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-border hover:bg-secondary transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={isPending}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-foreground text-primary-foreground hover:bg-foreground/90 disabled:opacity-60 transition-colors"
              >
                {isPending ? 'Guardando...' : 'Crear negocio'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
