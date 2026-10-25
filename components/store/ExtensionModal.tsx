'use client'

import { useState, useTransition } from 'react'
import { X } from 'lucide-react'
import { solicitarExtensionMembresia } from '@/lib/actions/filamento-pedidos'
import type { NivelMembresia } from '@/lib/membresia-helpers'
import { DIAS_EXTENSION } from '@/lib/membresia-helpers'

const COSTO_POR_NIVEL: Record<string, number> = {
  Mayorista: 2000,
  Plus: 4000,
  Elite: 10000,
}

export default function ExtensionModal({ nivel, diasRestantes = 10 }: { nivel: NivelMembresia; diasRestantes?: number }) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const costo = COSTO_POR_NIVEL[nivel ?? 'Mayorista'] ?? 2000
  const urgente = diasRestantes <= 2

  function handleSolicitar() {
    startTransition(async () => {
      await solicitarExtensionMembresia()
    })
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-bold transition-all hover:opacity-90"
        style={urgente
          ? { backgroundColor: '#d97706', color: '#fff', border: '2px solid #f59e0b', boxShadow: '0 0 12px rgba(217,119,6,0.5)' }
          : { backgroundColor: 'rgba(217,119,6,0.15)', color: '#fcd34d', border: '1px solid rgba(217,119,6,0.35)' }
        }
      >
        {urgente ? '🚨' : '⚡'} Extender membresía {DIAS_EXTENSION} días →
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <div
            className="relative w-full max-w-sm rounded-2xl p-5 space-y-4"
            style={{ backgroundColor: '#1a1500', border: '1px solid #d97706' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Cerrar */}
            <button onClick={() => setOpen(false)} className="absolute top-3 right-3 p-1.5 rounded-lg" style={{ color: '#86efac' }}>
              <X size={16} />
            </button>

            {/* Header */}
            <div>
              <p className="font-black text-lg leading-none" style={{ color: '#fcd34d' }}>⚡ Extender membresía</p>
              <p className="text-xs mt-1" style={{ color: '#86efac' }}>+{DIAS_EXTENSION} días de membresía {nivel}</p>
            </div>

            {/* Explicación */}
            <div className="text-sm leading-relaxed space-y-2" style={{ color: '#f0fdf4' }}>
              <p>
                Si tu membresía está por vencer y no llegás a acumular 5 kg para renovarla automáticamente, podés <strong style={{ color: '#fcd34d' }}>extenderla {DIAS_EXTENSION} días más</strong> haciendo una transferencia.
              </p>
              <p style={{ color: '#86efac' }}>
                El costo varía según tu nivel actual:
              </p>
              <div className="space-y-1 text-xs">
                {Object.entries(COSTO_POR_NIVEL).map(([n, c]) => (
                  <div key={n} className="flex justify-between items-center px-3 py-1.5 rounded-lg" style={{ backgroundColor: n === nivel ? 'rgba(217,119,6,0.15)' : 'rgba(255,255,255,0.04)' }}>
                    <span style={{ color: n === nivel ? '#fcd34d' : '#86efac' }}>{n === nivel ? '→ ' : ''}{n}</span>
                    <span className="font-bold" style={{ color: '#f0fdf4' }}>${c.toLocaleString('es-AR')}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Alias */}
            <div className="px-4 py-3 rounded-xl space-y-1" style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <p className="text-xs" style={{ color: '#86efac' }}>Transferí <strong style={{ color: '#f0fdf4' }}>${costo.toLocaleString('es-AR')}</strong> a este alias:</p>
              <p className="font-black text-xl tracking-wide" style={{ color: '#f0fdf4' }}>juan3d.nx</p>
              <p className="text-xs" style={{ color: '#86efac' }}>Juan Pablo Arnaudo Zalazar</p>
            </div>

            {/* CTA */}
            <button
              onClick={handleSolicitar}
              disabled={isPending}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-bold transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: 'rgba(217,119,6,0.3)', color: '#fcd34d', border: '1px solid #d97706' }}
            >
              {isPending ? 'Procesando...' : '✅ Ya pagué — enviar comprobante por WhatsApp →'}
            </button>

            <p className="text-[11px] text-center" style={{ color: '#86efac' }}>
              Una vez que confirmemos el pago, activamos los {DIAS_EXTENSION} días automáticamente.
            </p>
          </div>
        </div>
      )}
    </>
  )
}
