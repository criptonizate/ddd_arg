'use client'

import { useEffect, useState } from 'react'
import { X, Eye } from 'lucide-react'

export interface ComparadorItem {
  id: string
  color: string
  material: string
  marca: string
  imagen: string | null
  precio_kg: number
  stock_disp_kg: number
}

const STORAGE_KEY = 'ddd_comparador_v1'
const EVENT = 'ddd:comparador-change'
const MAX = 3

// ─── Helpers accesibles desde cualquier componente ───────────────────────────
export function pinComparador(item: ComparadorItem): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const list: ComparadorItem[] = raw ? JSON.parse(raw) : []
    if (list.find(i => i.id === item.id)) return false
    if (list.length >= MAX) return false
    const next = [...list, item]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    window.dispatchEvent(new CustomEvent(EVENT))
    return true
  } catch { return false }
}

export function unpinComparador(id: string) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const list: ComparadorItem[] = raw ? JSON.parse(raw) : []
    const next = list.filter(i => i.id !== id)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    window.dispatchEvent(new CustomEvent(EVENT))
  } catch {}
}

export function isPinnedComparador(id: string): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const list: ComparadorItem[] = raw ? JSON.parse(raw) : []
    return !!list.find(i => i.id === id)
  } catch { return false }
}

function fmtARS(n: number) { return `$${n.toLocaleString('es-AR')}` }

// ─── Componente: barra flotante + modal side-by-side ────────────────────────
export default function ColorComparador() {
  const [items, setItems] = useState<ComparadorItem[]>([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const load = () => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY)
        setItems(raw ? JSON.parse(raw) : [])
      } catch { setItems([]) }
    }
    load()
    const onChange = () => load()
    window.addEventListener(EVENT, onChange)
    window.addEventListener('storage', onChange) // cross-tab
    return () => {
      window.removeEventListener(EVENT, onChange)
      window.removeEventListener('storage', onChange)
    }
  }, [])

  if (items.length === 0) return null

  return (
    <>
      {/* Barra flotante */}
      <div
        className="fixed right-4 z-40 bg-black/85 backdrop-blur text-white rounded-2xl shadow-xl px-3 py-2 flex items-center gap-2 border border-white/10"
        style={{ bottom: 'calc(env(safe-area-inset-bottom) + 5.5rem)' }}
      >
        <div className="flex items-center gap-1.5">
          {items.map(it => (
            <button
              key={it.id}
              onClick={() => unpinComparador(it.id)}
              className="relative w-9 h-9 rounded-lg overflow-hidden border border-white/20 shrink-0"
              aria-label={`Quitar ${it.color} del comparador`}
              title={`${it.color} · ${it.marca}`}
            >
              {it.imagen ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={it.imagen} alt={it.color} className="w-full h-full object-cover" />
              ) : (
                <span className="block w-full h-full bg-white/10" />
              )}
              <span className="absolute inset-0 opacity-0 hover:opacity-100 bg-black/60 flex items-center justify-center transition-opacity">
                <X size={14} />
              </span>
            </button>
          ))}
          {items.length < MAX && (
            <span className="text-[10px] text-white/50 px-1">
              {MAX - items.length} más
            </span>
          )}
        </div>
        <button
          onClick={() => setOpen(true)}
          className="ml-1 inline-flex items-center gap-1 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg"
          aria-label="Abrir comparador"
        >
          <Eye size={12} />
          Comparar
        </button>
      </div>

      {open && (
        <ComparadorModal items={items} onClose={() => setOpen(false)} onRemove={unpinComparador} />
      )}
    </>
  )
}

function ComparadorModal({
  items, onClose, onRemove,
}: {
  items: ComparadorItem[]
  onClose: () => void
  onRemove: (id: string) => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[65] flex items-center justify-center bg-black/80 p-3"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Comparador de colores"
    >
      <div
        className="bg-background text-foreground rounded-2xl max-w-3xl w-full max-h-[90dvh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <h2 className="font-bold text-base">Compará tus colores</h2>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-secondary"
          >
            <X size={16} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 overflow-y-auto">
          {items.map(it => (
            <div key={it.id} className="bg-card border border-border rounded-xl overflow-hidden flex flex-col">
              <div className="relative aspect-square bg-secondary">
                {it.imagen ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={it.imagen} alt={it.color} className="w-full h-full object-cover" />
                ) : (
                  <span className="block w-full h-full bg-muted" />
                )}
                <button
                  onClick={() => onRemove(it.id)}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center"
                  aria-label={`Quitar ${it.color}`}
                ><X size={14} /></button>
              </div>
              <div className="p-3 flex-1 flex flex-col gap-1">
                <p className="font-bold text-sm leading-tight">{it.color}</p>
                <p className="text-[11px] text-muted-foreground">{it.material} — {it.marca}</p>
                <p className="text-xs font-semibold mt-1">{fmtARS(it.precio_kg)}/kg</p>
                <p className="text-[11px] text-muted-foreground">
                  {it.stock_disp_kg > 0 ? `${it.stock_disp_kg} kg disponibles` : 'Sin stock'}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="px-5 py-3 border-t border-border text-[11px] text-muted-foreground text-center">
          Tocá la X de cada color para quitarlo. Los pines se guardan en este dispositivo.
        </div>
      </div>
    </div>
  )
}
