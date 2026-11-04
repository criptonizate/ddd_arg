'use client'

import { useActionState } from 'react'
import { createEgreso } from '@/lib/actions/finance'
import { EGRESO_CATEGORIA_LABELS } from '@/lib/utils'

type FormState = { error?: Record<string, string[]> | string; success?: boolean } | undefined

async function action(_prev: FormState, formData: FormData): Promise<FormState> {
  const data = {
    categoria: formData.get('categoria') as string,
    monto: Number(formData.get('monto')),
    descripcion: formData.get('descripcion') as string,
    fecha: formData.get('fecha') as string,
  }
  return createEgreso(data as any)
}

export default function EgresoForm() {
  const [state, formAction, pending] = useActionState(action, undefined)
  const err = typeof state?.error === 'object' ? state.error : {}

  return (
    <form action={formAction} className="space-y-4 bg-card border border-border rounded-xl p-5 shadow-sm">
      {state?.success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700 dark:bg-green-900/30 dark:border-green-700 dark:text-green-300">
          Egreso registrado correctamente
        </div>
      )}
      {typeof state?.error === 'string' && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm text-destructive">
          {state.error}
        </div>
      )}

      <div>
        <label htmlFor="egreso-categoria" className="text-xs font-medium mb-1 block">Categoría *</label>
        <select
          id="egreso-categoria"
          name="categoria"
          className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          required
        >
          {Object.entries(EGRESO_CATEGORIA_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="egreso-monto" className="text-xs font-medium mb-1 block">Monto (ARS) *</label>
        <input
          id="egreso-monto"
          name="monto"
          type="number"
          min="0.01"
          step="0.01"
          placeholder="0"
          className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          required
          aria-invalid={err.monto ? 'true' : undefined}
          aria-describedby={err.monto ? 'egreso-monto-error' : undefined}
        />
        {err.monto && <p id="egreso-monto-error" role="alert" className="text-xs text-destructive mt-1">{err.monto[0]}</p>}
      </div>

      <div>
        <label htmlFor="egreso-fecha" className="text-xs font-medium mb-1 block">Fecha *</label>
        <input
          id="egreso-fecha"
          name="fecha"
          type="date"
          defaultValue={new Date().toISOString().split('T')[0]}
          className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          required
        />
      </div>

      <div>
        <label htmlFor="egreso-descripcion" className="text-xs font-medium mb-1 block">Descripción</label>
        <input
          id="egreso-descripcion"
          name="descripcion"
          placeholder="Detalle..."
          className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full py-2 rounded-lg text-sm font-medium bg-foreground text-primary-foreground hover:bg-foreground/90 disabled:opacity-60 transition-colors"
      >
        {pending ? 'Guardando...' : 'Registrar egreso'}
      </button>
    </form>
  )
}
