'use client'

import { useState, useTransition } from 'react'
import { createCliente } from '@/lib/actions/clientes'
import { useToast } from './ToastProvider'
import { useRouter } from 'next/navigation'
import { Plus, X } from 'lucide-react'

export default function NuevoClienteButton() {
  const [open, setOpen] = useState(false)
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()
  const router = useRouter()

  function handleClose() { setOpen(false); setNombre(''); setTelefono(''); setError(null) }

  function handleSubmit() {
    if (!nombre.trim()) { setError('El nombre es obligatorio'); return }
    setError(null)
    startTransition(async () => {
      const res = await createCliente({ nombre, telefono: telefono || undefined })
      if (res.error) { setError(res.error); return }
      toast(`Cliente "${nombre}" creado ✓`)
      handleClose()
      if (res.id) router.push(`/admin/clientes/${res.id}`)
    })
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 bg-foreground text-primary-foreground hover:bg-foreground/90 transition-colors rounded-lg px-4 py-2 text-sm font-medium"
      >
        <Plus size={15} /> Nuevo cliente
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={handleClose} />
          <div className="relative bg-card rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="font-semibold">Nuevo cliente</h2>
              <button onClick={handleClose} className="p-1.5 rounded-lg hover:bg-secondary"><X size={15} /></button>
            </div>
            <div className="p-5 space-y-4">
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div>
                <label className="text-xs font-medium mb-1 block">Nombre *</label>
                <input
                  value={nombre} onChange={(e) => setNombre(e.target.value)}
                  autoFocus
                  className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Juan García"
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Teléfono <span className="text-muted-foreground font-normal">(opcional)</span></label>
                <input
                  value={telefono} onChange={(e) => setTelefono(e.target.value)}
                  className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="11 1234-5678"
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                />
              </div>
              <p className="text-xs text-muted-foreground">Email, dirección y notas se pueden agregar después.</p>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-border">
              <button onClick={handleClose} className="px-4 py-2 rounded-lg text-sm font-medium border border-border hover:bg-secondary transition-colors">Cancelar</button>
              <button onClick={handleSubmit} disabled={isPending}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-foreground text-primary-foreground hover:bg-foreground/90 disabled:opacity-60 transition-colors">
                {isPending ? 'Creando...' : 'Crear cliente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
