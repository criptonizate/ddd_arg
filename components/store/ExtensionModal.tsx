'use client'

import { useState, useTransition } from 'react'
import { X, CheckCircle2 } from 'lucide-react'
import { solicitarExtensionMembresia } from '@/lib/actions/filamento-pedidos'
import type { NivelMembresia } from '@/lib/membresia-helpers'
import { DIAS_EXTENSION, COSTO_EXTENSION_POR_NIVEL } from '@/lib/membresia-helpers'

const WHATSAPP = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '543804559909'
const ALIAS = process.env.NEXT_PUBLIC_ALIAS_PAGO ?? 'juan3d.nx'
const NOMBRE_TITULAR = process.env.NEXT_PUBLIC_NOMBRE_TITULAR ?? 'Juan Pablo Arnaudo Zalazar'

export default function ExtensionModal({ nivel, diasRestantes = 10 }: { nivel: NivelMembresia; diasRestantes?: number }) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [success, setSuccess] = useState(false)

  const costo = COSTO_EXTENSION_POR_NIVEL[nivel ?? 'Plata'] ?? 2000
  const urgente = diasRestantes <= 2

  const whatsappMsg = encodeURIComponent(
    `Hola! Hice la transferencia de $${costo.toLocaleString('es-AR')} al alias ${ALIAS} para extender mi membresía ${nivel} ${DIAS_EXTENSION} días. Adjunto el comprobante.`
  )

  function handleSolicitar() {
    startTransition(async () => {
      await solicitarExtensionMembresia()
      setSuccess(true)
    })
  }

  function handleClose() {
    setOpen(false)
    // Reset del estado success después de cerrar (con delay para evitar flicker)
    setTimeout(() => setSuccess(false), 300)
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
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" onClick={handleClose}>
          <div className="absolute inset-0 bg-black/60" />
          <div
            className="relative w-full max-w-sm rounded-2xl p-5 space-y-4 max-h-[85vh] overflow-y-auto"
            style={{ backgroundColor: '#1a1500', border: '1px solid #d97706' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Cerrar */}
            <button onClick={handleClose} aria-label="Cerrar" className="absolute top-3 right-3 p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg" style={{ color: '#86efac' }}>
              <X size={16} />
            </button>

            {success ? (
              /* ── Vista de éxito: comprobante por WhatsApp ── */
              <>
                <div className="flex flex-col items-center text-center space-y-3 pt-2">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(74,222,128,0.2)' }}>
                    <CheckCircle2 size={28} style={{ color: '#4ade80' }} />
                  </div>
                  <p className="font-black text-lg" style={{ color: '#f0fdf4' }}>¡Solicitud registrada!</p>
                  <p className="text-sm" style={{ color: '#86efac' }}>Ahora mandanos el comprobante de la transferencia por WhatsApp para que confirmemos tu extensión.</p>
                </div>

                <div className="px-4 py-3 rounded-xl space-y-1" style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <p className="text-xs" style={{ color: '#86efac' }}>Monto transferido:</p>
                  <p className="font-black text-xl" style={{ color: '#f0fdf4' }}>${costo.toLocaleString('es-AR')}</p>
                  <p className="text-xs" style={{ color: '#86efac' }}>Alias: <strong style={{ color: '#f0fdf4' }}>{ALIAS}</strong></p>
                </div>

                <a
                  href={`https://wa.me/${WHATSAPP}?text=${whatsappMsg}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-bold transition-opacity hover:opacity-90"
                  style={{ backgroundColor: '#25D366', color: '#fff' }}
                >
                  📱 Enviar comprobante por WhatsApp
                </a>

                <p className="text-[11px] text-center" style={{ color: '#86efac' }}>
                  Mientras confirmamos, tu membresía <strong>sigue activa</strong>. Una vez verificado el pago, aplicamos los +{DIAS_EXTENSION} días.
                </p>

                <button onClick={handleClose} className="w-full text-xs underline py-2" style={{ color: '#86efac' }}>
                  Cerrar
                </button>
              </>
            ) : (
              /* ── Vista inicial ── */
              <>
                <div>
                  <p className="font-black text-lg leading-none" style={{ color: '#fcd34d' }}>⚡ Extender membresía</p>
                  <p className="text-xs mt-1" style={{ color: '#86efac' }}>+{DIAS_EXTENSION} días de membresía {nivel}</p>
                </div>

                <div className="text-sm leading-relaxed space-y-2" style={{ color: '#f0fdf4' }}>
                  <p>
                    Si tu membresía está por vencer y no llegás a acumular 5 kg para renovarla automáticamente, podés <strong style={{ color: '#fcd34d' }}>extenderla {DIAS_EXTENSION} días más</strong> haciendo una transferencia.
                  </p>
                  <p style={{ color: '#86efac' }}>El costo varía según tu nivel actual:</p>
                  <div className="space-y-1 text-xs">
                    {Object.entries(COSTO_EXTENSION_POR_NIVEL).map(([n, c]) => (
                      <div key={n} className="flex justify-between items-center px-3 py-1.5 rounded-lg" style={{ backgroundColor: n === nivel ? 'rgba(217,119,6,0.15)' : 'rgba(255,255,255,0.04)' }}>
                        <span style={{ color: n === nivel ? '#fcd34d' : '#86efac' }}>{n === nivel ? '→ ' : ''}{n}</span>
                        <span className="font-bold" style={{ color: '#f0fdf4' }}>${c.toLocaleString('es-AR')}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="px-4 py-3 rounded-xl space-y-1" style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <p className="text-xs" style={{ color: '#86efac' }}>Transferí <strong style={{ color: '#f0fdf4' }}>${costo.toLocaleString('es-AR')}</strong> a este alias:</p>
                  <p className="font-black text-xl tracking-wide" style={{ color: '#f0fdf4' }}>{ALIAS}</p>
                  <p className="text-xs" style={{ color: '#86efac' }}>{NOMBRE_TITULAR}</p>
                </div>

                <button
                  onClick={handleSolicitar}
                  disabled={isPending}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-bold transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: 'rgba(217,119,6,0.3)', color: '#fcd34d', border: '1px solid #d97706' }}
                >
                  {isPending ? 'Procesando...' : '✅ Ya transferí — continuar'}
                </button>

                <p className="text-[11px] text-center" style={{ color: '#86efac' }}>
                  Una vez que confirmemos el pago, activamos los {DIAS_EXTENSION} días automáticamente.
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
