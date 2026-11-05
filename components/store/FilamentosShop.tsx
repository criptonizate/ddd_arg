'use client'

import { useState, useMemo, useTransition, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ShoppingCart, Plus, Minus, X, Trash2, CheckCircle2, Loader2, SlidersHorizontal, Search, Bell, BellOff, Pin, PinOff } from 'lucide-react'
import { pinComparador, unpinComparador, isPinnedComparador } from '@/components/store/ColorComparador'
import type { Filamento } from '@/lib/filamentos-helpers'
import { crearPedidoFilamento } from '@/lib/actions/filamento-pedidos'
import type { MembresiaStatus } from '@/lib/actions/filamento-pedidos'
import { getFilamentosDisponibles, enviarSugerenciaFilamento } from '@/lib/actions/filamentos'
import { signInWithGoogleAndReturn } from '@/lib/actions/auth'
import { PUNTOS_POR_CANJE, PESOS_POR_CANJE } from '@/lib/ddd-coins-helpers'
import { TIERS_MEMBRESIA } from '@/lib/membresia-helpers'
import { createBrowserClient } from '@supabase/ssr'
import type { User } from '@supabase/supabase-js'
import { useCart } from '@/components/store/CartProvider'
import { useFocusTrap } from '@/lib/hooks/useFocusTrap'

const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '543804559909'
const PRECIO_BASE_DEFAULT = 22000

// Dirección del local para retiro en persona. EDITAR cuando cambie el domicilio.
// La query de Google Maps es la dirección tal cual: Maps la geocodifica.
const RETIRO_LOCAL = {
  direccion: 'Capital, La Rioja, Argentina',
  mapsQuery: 'DDD ARG, La Rioja, Argentina',
}

const DESCUENTOS = TIERS_MEMBRESIA.map(t => ({
  min: t.min,
  descuento: t.descuento,
  label: `${t.min}+ kg`,
}))

function getDescuento(total: number) {
  return DESCUENTOS.find(t => total >= t.min) ?? { descuento: 0, label: '' }
}

// Traducción de nombres de color (EN → ES) para que la abuela, el niño y el
// comprador apurado vean algo que entienden. Si el color ya trae texto en
// español, se deja pasar. Devuelve: "Rojo · Berry Red" cuando hay match y el
// nombre crudo si no reconocemos ninguna palabra clave.
const COLOR_ES: { keys: string[]; es: string }[] = [
  { keys: ['black'],                                                 es: 'Negro' },
  { keys: ['white'],                                                 es: 'Blanco' },
  { keys: ['grey', 'gray'],                                          es: 'Gris' },
  { keys: ['vermilion', 'ruby'],                                     es: 'Bermellón' },
  { keys: ['berry', 'red'],                                          es: 'Rojo' },
  { keys: ['blue'],                                                  es: 'Azul' },
  { keys: ['teal'],                                                  es: 'Verde agua' },
  { keys: ['olive'],                                                 es: 'Verde oliva' },
  { keys: ['green'],                                                 es: 'Verde' },
  { keys: ['yellow', 'sunshine'],                                    es: 'Amarillo' },
  { keys: ['orange'],                                                es: 'Naranja' },
  { keys: ['taro', 'purple', 'violet'],                              es: 'Violeta' },
  { keys: ['pink'],                                                  es: 'Rosa' },
  { keys: ['brown', 'madera'],                                       es: 'Marrón' },
  { keys: ['gold'],                                                  es: 'Dorado' },
  { keys: ['silver'],                                                es: 'Plateado' },
]

function colorEnEs(color: string): string {
  const c = color.toLowerCase()
  // Si ya tiene palabra en español, no tocamos.
  const yaES = /negro|blanco|gris|rojo|azul|verde|amarillo|naranja|violeta|rosa|marrón|marron|dorado|plateado|bermell/i.test(color)
  if (yaES) return color
  const match = COLOR_ES.find(m => m.keys.some(k => c.includes(k)))
  if (!match) return color
  // Si el nombre original es solo la keyword (ej. "Gold"), mostramos solo el ES.
  // Si es un nombre más largo (ej. "Berry Red"), mostramos "Rojo · Berry Red".
  const soloKeyword = match.keys.some(k => c.trim() === k)
  return soloKeyword ? match.es : `${match.es} · ${color}`
}

function colorToCss(color: string): string {
  const c = color.toLowerCase()
  if (c.includes('black'))                            return '#1a1a1a'
  if (c.includes('white'))                            return '#f0f0f0'
  if (c.includes('grey') || c.includes('gray'))       return '#9ca3af'
  if (c.includes('vermilion') || c.includes('ruby'))  return '#c0392b'
  if (c.includes('berry') || c.includes('red'))       return '#e53e3e'
  if (c.includes('blue'))                             return '#3b82f6'
  if (c.includes('teal'))                             return '#14b8a6'
  if (c.includes('olive'))                            return '#84a830'
  if (c.includes('green'))                            return '#22c55e'
  if (c.includes('yellow') || c.includes('sunshine')) return '#eab308'
  if (c.includes('orange'))                           return '#f97316'
  if (c.includes('taro') || c.includes('purple'))     return '#a855f7'
  if (c.includes('pink'))                             return '#ec4899'
  if (c.includes('brown') || c.includes('madera'))    return '#92400e'
  if (c.includes('silk') || c.includes('gold'))       return '#d97706'
  return '#94a3b8'
}

// Si la URL apunta a Supabase storage, añadimos params de resize/quality para
// servir una versión optimizada (importante en 3G). Para otros hosts, pasamos
// la URL tal cual.
function imgUrl(url: string, width?: number, quality?: number): string {
  if (!url) return url
  if (!width && !quality) return url
  const esSupabase = /\/storage\/v1\/object\//.test(url)
  if (!esSupabase) return url
  // Supabase Image Transformation: /render/image/public/... o params ?width=&quality=
  const render = url.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/')
  const sep = render.includes('?') ? '&' : '?'
  const params: string[] = []
  if (width) params.push(`width=${Math.round(width)}`)
  if (quality) params.push(`quality=${Math.round(quality)}`)
  return render + sep + params.join('&')
}

function shortNombre(nombre: string): string {
  return nombre.replace(/\s+high\s+speed\b/gi, '').replace(/\s+hs\b/gi, '').trim()
}

function fmtARS(n: number) {
  return `$${n.toLocaleString('es-AR')}`
}

// Idempotency key para el checkout. Usamos crypto.randomUUID cuando existe,
// y un fallback para browsers viejos (poco probable en 2026 pero no cuesta).
function generarIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `k-${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${Math.random().toString(36).slice(2, 10)}`
}

function maxKg(f: Filamento): number {
  const totalGr = f.rollos_cerrados * f.peso_rollo_gr + f.gramos_sueltos
  return Math.floor(Math.max(0, totalGr - (f.gramos_reservados ?? 0)) / 1000)
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
}

function AuthModal({ onClose, onLogin }: { onClose: () => void; onLogin: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null)
  useFocusTrap(panelRef, true)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      onClick={onClose}
    >
      <div ref={panelRef} className="w-full max-w-sm bg-background rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-7 space-y-5">
          <div className="text-center">
            <div className="text-4xl mb-3" aria-hidden="true">🔒</div>
            <h2 id="auth-modal-title" className="text-lg font-bold mb-2">Ingresá para hacer tu pedido</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Con tu cuenta podés ver tus pedidos anteriores, repetirlos con un toque y acceder a{' '}
              <span className="font-semibold text-orange-600 dark:text-orange-400">descuentos por cantidad</span> al comprar 5 kg o más por mes.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { icon: '📦', text: 'Ver y repetir pedidos' },
              { icon: '🪙', text: 'Puntos que no caducan' },
              { icon: '💰', text: 'Descuento por cantidad' },
            ].map((b, i) => (
              <div key={i} className="bg-secondary/60 rounded-xl p-3">
                <div className="text-2xl mb-1">{b.icon}</div>
                <p className="text-xs text-muted-foreground leading-tight">{b.text}</p>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-border bg-secondary/40 px-3.5 py-2.5 text-xs space-y-1">
            <p className="font-semibold text-foreground">Descuentos por cantidad (al mes)</p>
            <div className="flex justify-between"><span className="text-muted-foreground">5 kg o más</span><span className="font-semibold">−$2.000/kg</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">10 kg o más</span><span className="font-semibold">−$3.000/kg</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">15 kg o más</span><span className="font-semibold">−$4.000/kg</span></div>
          </div>

          <button
            onClick={onLogin}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-border bg-background hover:bg-secondary transition-colors text-sm font-semibold shadow-sm"
          >
            <GoogleIcon />
            Continuar con Google
          </button>

          <button
            onClick={onClose}
            className="w-full text-xs text-muted-foreground hover:text-foreground py-1 text-center"
          >
            Seguir viendo sin ingresar
          </button>
        </div>
      </div>
    </div>
  )
}

type CartItem = { filamento: Filamento; rollos: number }
type CheckoutStep = 'form' | 'confirm' | 'saving' | 'done'

const MAT_COLORS: Record<string, string> = {
  PLA:  '#22c55e', PETG: '#3b82f6', TPU: '#a855f7', ABS: '#f97316', ASA: '#eab308',
}

const MAT_INFO: Record<string, string> = {
  PLA:  'Fácil de imprimir. Ideal para prototipos y decoración. No tolera altas temperaturas.',
  PETG: 'Resistente y flexible. Tolera algo de calor. Bueno para piezas funcionales.',
  TPU:  'Flexible y elástico. Ideal para piezas que necesitan doblar o absorber impactos.',
  ABS:  'Resistente al calor. Requiere temperatura estable y enclosure. Puede curlar.',
  ASA:  'Como ABS pero con resistencia UV. Perfecto para uso exterior.',
  SILK: 'Acabado brillante y sedoso. Igual proceso que PLA. Solo decorativo.',
}

// ── Helpers visuales ──────────────────────────────────────────────────────────

function colorIsLight(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 > 160
}

// ── Body scroll lock (compartido entre overlays anidados) ────────────────────
let __bodyScrollLockCount = 0
function bodyScrollLockAcquire() {
  __bodyScrollLockCount++
  if (__bodyScrollLockCount === 1) {
    document.body.style.overflow = 'hidden'
    document.body.style.touchAction = 'none'
  }
}
function bodyScrollLockRelease() {
  __bodyScrollLockCount = Math.max(0, __bodyScrollLockCount - 1)
  if (__bodyScrollLockCount === 0) {
    document.body.style.overflow = ''
    document.body.style.touchAction = ''
  }
}

// ── Lightbox ──────────────────────────────────────────────────────────────────

function Lightbox({ fotos, startIdx, onClose, managesHistory = true }: { fotos: string[]; startIdx: number; onClose: () => void; managesHistory?: boolean }) {
  const [idx, setIdx] = useState(startIdx)
  const prev = () => setIdx((i) => (i - 1 + fotos.length) % fotos.length)
  const next = () => setIdx((i) => (i + 1) % fotos.length)
  const [dragX, setDragX] = useState(0)
  const touchStart = useRef<{ x: number; y: number; t: number } | null>(null)
  const isSwipe = useRef(false)

  // Bloquear scroll del fondo mientras el lightbox está abierto.
  // Usamos un contador global para soportar overlays anidados (modal + lightbox)
  // y evitar que StrictMode (doble invocación de effects en dev) deje el body
  // bloqueado al desmontar.
  useEffect(() => {
    bodyScrollLockAcquire()
    return () => bodyScrollLockRelease()
  }, [])

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0]
    touchStart.current = { x: t.clientX, y: t.clientY, t: Date.now() }
    isSwipe.current = false
  }
  const onTouchMove = (e: React.TouchEvent) => {
    if (!touchStart.current) return
    const t = e.touches[0]
    const dx = t.clientX - touchStart.current.x
    const dy = t.clientY - touchStart.current.y
    if (!isSwipe.current && Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 8) {
      isSwipe.current = true
    }
    if (isSwipe.current) {
      setDragX(dx)
    }
  }
  const onTouchEnd = () => {
    if (!touchStart.current) return
    const dx = dragX
    const dur = Date.now() - touchStart.current.t
    const threshold = 60
    const fast = dur < 300 && Math.abs(dx) > 30
    if (fotos.length > 1 && (Math.abs(dx) > threshold || fast)) {
      if (dx < 0) next(); else prev()
    }
    touchStart.current = null
    isSwipe.current = false
    setDragX(0)
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Cancelar el back del navegador/celular mientras el lightbox está abierto:
  // re-empujamos el state en cada popstate para que la página no avance ni
  // salga del sitio. El usuario cierra con la X, Escape o click fuera.
  useEffect(() => {
    if (!managesHistory) return
    const STATE_MARK = { __lightboxOpen: true }
    window.history.pushState(STATE_MARK, '')
    const onPop = () => {
      window.history.pushState(STATE_MARK, '')
    }
    window.addEventListener('popstate', onPop)
    return () => {
      window.removeEventListener('popstate', onPop)
      // Al desmontar, consumir el state que empujamos para dejar el history limpio.
      try { window.history.back() } catch { /* noop */ }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 p-4 touch-pan-y select-none"
      onClick={onClose}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
        aria-label="Cerrar"
      >
        <X size={18} />
      </button>

      {fotos.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); prev() }}
            aria-label="Foto anterior"
            className="absolute left-3 z-10 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
          >
            <svg width="16" height="16" viewBox="0 0 12 12" fill="none"><path d="M8 2L4 6l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); next() }}
            aria-label="Foto siguiente"
            className="absolute right-3 z-10 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
          >
            <svg width="16" height="16" viewBox="0 0 12 12" fill="none"><path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </>
      )}

      <img
        src={imgUrl(fotos[idx], (() => {
          if (typeof window === 'undefined') return 1200
          const dpr = window.devicePixelRatio || 1
          return Math.min(1200, Math.round(window.innerWidth * dpr))
        })(), 85)}
        alt={`Foto ${idx + 1} de ${fotos.length}`}
        className="max-w-full max-h-[85dvh] object-contain rounded-lg shadow-2xl pointer-events-none"
        style={{
          transform: `translateX(${dragX}px)`,
          transition: dragX === 0 ? 'transform 180ms ease-out' : 'none',
        }}
        draggable={false}
        onError={(e) => { (e.target as HTMLImageElement).src = fotos[idx] }}
      />

      {fotos.length > 1 && (
        <div className="absolute bottom-5 left-0 right-0 flex justify-center gap-2">
          {fotos.map((_, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); setIdx(i) }}
              aria-label={`Ir a foto ${i + 1}`}
              aria-current={i === idx ? 'true' : undefined}
              className={`rounded-full transition-all ${i === idx ? 'w-5 h-2 bg-white' : 'w-2 h-2 bg-white/40 hover:bg-white/70'}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Card del grupo (marca + material) ─────────────────────────────────────────

function FilamentoGrupoCard({
  grupo, cart, onOpen, onAddColor,
}: {
  grupo: { marca: string; material: string; filamentos: Filamento[] }
  cart: CartItem[]
  onOpen: () => void
  onAddColor: (f: Filamento) => void
}) {
  // Representativo: el primer color con stock y con foto. Fallback: primero del grupo.
  const conFoto = grupo.filamentos.find(f => (f.imagen_url || f.imagen_url_2 || f.imagen_url_3) && maxKg(f) > 0)
    ?? grupo.filamentos.find(f => f.imagen_url || f.imagen_url_2 || f.imagen_url_3)
    ?? grupo.filamentos[0]
  const foto = conFoto.imagen_url ?? conFoto.imagen_url_2 ?? conFoto.imagen_url_3 ?? null
  const cssRepr = colorToCss(conFoto.color)

  const totalColores = grupo.filamentos.length
  const coloresConStock = grupo.filamentos.filter(f => maxKg(f) > 0).length
  const algunoUltimo = grupo.filamentos.some(f => {
    const d = maxKg(f)
    return d > 0 && d <= 3
  })

  // Swatches (hasta 8 colores únicos, priorizando los que tienen stock)
  const swatches = grupo.filamentos.slice(0, 8)
  const kgEnCart = cart
    .filter(i => i.filamento.marca === grupo.marca && i.filamento.material === grupo.material)
    .reduce((s, i) => s + i.rollos, 0)

  const precios = grupo.filamentos.map(f => f.precio_kg ?? PRECIO_BASE_DEFAULT)
  const precioMin = Math.min(...precios)
  const precioMax = Math.max(...precios)
  const precioLabel = precioMin === precioMax
    ? fmtARS(precioMin)
    : `desde ${fmtARS(precioMin)}`

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen() }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={handleKey}
      className={`cursor-pointer text-left rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow border focus:outline-none focus:ring-2 focus:ring-orange-400 ${kgEnCart > 0 ? 'ring-1' : ''}`}
      style={{
        backgroundColor: 'oklch(0.26 0.005 264)',
        borderColor: kgEnCart > 0 ? '#15803d' : 'oklch(1 0 0 / 10%)',
        ...(kgEnCart > 0 ? { boxShadow: '0 0 0 1px #15803d44' } : {}),
      }}
      aria-label={`Ver colores de ${grupo.marca} ${grupo.material}`}
    >
      <div
        className="relative h-40 flex items-center justify-center overflow-hidden"
        style={foto ? {} : { backgroundColor: cssRepr }}
      >
        {foto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imgUrl(foto, 400, 70)}
            alt={`${grupo.marca} ${grupo.material}`}
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
            decoding="async"
            onError={(e) => { (e.target as HTMLImageElement).src = foto }}
          />
        ) : (
          <span className="w-16 h-16 rounded-full border-4 border-white/30" style={{ backgroundColor: cssRepr }} />
        )}

        {/* Indicador de últimas unidades en el grupo */}
        {algunoUltimo && (
          <span
            className="absolute top-2.5 right-2.5 text-sm px-1.5 py-0.5 rounded-full"
            style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
            title="Últimas unidades"
            aria-label="Últimas unidades"
          >🔥</span>
        )}

        {/* Indicador en carrito */}
        {kgEnCart > 0 && (
          <span className="absolute bottom-2 right-2 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full" style={{ backgroundColor: '#15803d' }}>
            {kgEnCart} kg
          </span>
        )}

        {/* Material badge arriba izq */}
        <span
          className="absolute top-2.5 left-2.5 text-xs font-black px-2 py-0.5 rounded-full"
          style={{ backgroundColor: MAT_COLORS[grupo.material] ?? '#94a3b8', color: '#fff' }}
        >
          {grupo.material}
        </span>
      </div>

      <div className="p-3.5 flex flex-col gap-2">
        <div>
          <p className="font-bold text-sm leading-tight">{grupo.marca}</p>
          <p className="text-xs text-muted-foreground leading-tight">{grupo.material}</p>
        </div>

        {/* Swatches — tocables: +1 kg directo al color. El doble handler
            (stopPropagation) evita que se dispare `onOpen` del card. */}
        <div className="flex items-center gap-1 flex-wrap">
          {swatches.map(f => {
            const sinStock = maxKg(f) <= 0
            return (
              <button
                key={f.id}
                type="button"
                onClick={(e) => { e.stopPropagation(); if (!sinStock) onAddColor(f) }}
                disabled={sinStock}
                aria-label={sinStock ? `${colorEnEs(f.color)} — sin stock` : `Agregar 1 kg de ${colorEnEs(f.color)}`}
                className={`group relative w-10 h-10 rounded-full border border-black/20 flex items-center justify-center text-white transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-orange-400 ${sinStock ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}
                style={{ backgroundColor: colorToCss(f.color) }}
                title={sinStock ? `${colorEnEs(f.color)} — sin stock` : `+1 kg ${colorEnEs(f.color)}`}
              >
                {!sinStock && (
                  <Plus
                    size={14}
                    className="opacity-0 group-hover:opacity-90 group-focus:opacity-90 transition-opacity drop-shadow-[0_0_2px_rgba(0,0,0,0.6)]"
                    aria-hidden="true"
                  />
                )}
              </button>
            )
          })}
          {grupo.filamentos.length > 8 && (
            <span className="text-xs text-muted-foreground ml-0.5">+{grupo.filamentos.length - 8}</span>
          )}
        </div>

        <div className="flex items-baseline justify-between gap-2 mt-0.5">
          <p className="text-base font-black leading-none">{precioLabel}</p>
          <p className="text-xs text-muted-foreground">
            {coloresConStock} de {totalColores} disponibles
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Modal detalle del grupo: lista de colores con add-to-cart por color ──

function GrupoColoresModal({
  grupo, onClose, cart, addToCart, setRollos, removeFromCart, precioParaFilamento, descuento,
  misAlertas, alertando, handleAvisar, onPayNow,
}: {
  grupo: { marca: string; material: string; filamentos: Filamento[] }
  onClose: () => void
  cart: CartItem[]
  addToCart: (f: Filamento) => void
  setRollos: (id: string, n: number) => void
  removeFromCart: (id: string) => void
  precioParaFilamento: (f: Filamento) => number
  descuento: number
  misAlertas: string[]
  alertando: string | null
  handleAvisar: (id: string) => void
  onPayNow: () => void
}) {
  // Totales del carrito global para la barra sticky de "Pagar ahora".
  const totalKgCart = cart.reduce((s, i) => s + i.rollos, 0)
  const totalCart = cart.reduce((s, i) => s + i.rollos * ((i.filamento.precio_kg ?? PRECIO_BASE_DEFAULT) - descuento), 0)
  const panelRef = useRef<HTMLDivElement>(null)
  useFocusTrap(panelRef, true)
  const [lightboxFotos, setLightboxFotos] = useState<string[] | null>(null)
  const lightboxRef = useRef<string[] | null>(null)
  useEffect(() => { lightboxRef.current = lightboxFotos }, [lightboxFotos])
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (lightboxFotos) {
        if (e.key === 'Escape') setLightboxFotos(null)
        return
      }
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, lightboxFotos])

  // Back del navegador: cierra primero el lightbox (si está abierto) y recién
  // en el siguiente back cierra el modal del grupo.
  useEffect(() => {
    let cerradoPorBack = false
    window.history.pushState({ __grupoOpen: true }, '')
    const onPop = () => {
      if (lightboxRef.current) {
        // Consumimos el pop cerrando el lightbox y volvemos a empujar el estado
        // para que el próximo back cierre el modal del grupo.
        setLightboxFotos(null)
        window.history.pushState({ __grupoOpen: true }, '')
        return
      }
      cerradoPorBack = true
      onClose()
    }
    window.addEventListener('popstate', onPop)
    return () => {
      window.removeEventListener('popstate', onPop)
      if (!cerradoPorBack) {
        try { window.history.back() } catch { /* noop */ }
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Bloquear scroll del fondo mientras el modal está abierto.
  useEffect(() => {
    bodyScrollLockAcquire()
    return () => bodyScrollLockRelease()
  }, [])

  return (
    <>
    {lightboxFotos && (
      <Lightbox fotos={lightboxFotos} startIdx={0} onClose={() => setLightboxFotos(null)} managesHistory={false} />
    )}
    <div
      className="fixed inset-0 z-[55] flex items-end sm:items-center justify-center sm:p-4 bg-black/60"
      role="dialog"
      aria-modal="true"
      aria-labelledby="grupo-modal-title"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        className="relative w-full sm:max-w-lg bg-background border border-border sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-y-auto"
        style={{ maxHeight: '92dvh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle mobile */}
        <div aria-hidden="true" className="sticky top-0 flex justify-center pt-2 pb-1 bg-background sm:hidden z-10">
          <span className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 id="grupo-modal-title" className="font-bold text-base">{grupo.marca}</h2>
            <p className="text-xs text-muted-foreground">
              {grupo.material} · {grupo.filamentos.length} colores
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-secondary"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <div className="divide-y divide-border pb-20 sm:pb-24">
          {grupo.filamentos.map(f => {
            const disponible = maxKg(f)
            const enCart = cart.find(i => i.filamento.id === f.id)?.rollos ?? 0
            const enMax = enCart >= disponible
            const sinStock = disponible <= 0
            const precio = precioParaFilamento(f)
            const precioBase = f.precio_kg ?? PRECIO_BASE_DEFAULT
            const yaAlertado = misAlertas.includes(f.id)
            const cargandoAlerta = alertando === f.id
            const fotosColor = [f.imagen_url, f.imagen_url_2, f.imagen_url_3].filter(Boolean) as string[]
            const fotoColor = fotosColor[0] ?? null
            return (
              <div
                key={f.id}
                className={`flex items-center gap-3 px-5 py-3 ${sinStock ? 'opacity-70' : ''}`}
              >
                {fotoColor ? (
                  <button
                    type="button"
                    onClick={() => setLightboxFotos(fotosColor)}
                    aria-label={`Ver foto grande de ${f.color}`}
                    className="shrink-0 rounded-xl overflow-hidden focus:outline-none focus:ring-2 focus:ring-orange-400"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imgUrl(fotoColor, 120, 70)}
                      alt={colorEnEs(f.color)}
                      className={`w-12 h-12 object-cover border border-black/10 shadow-sm cursor-zoom-in ${sinStock ? 'grayscale' : ''}`}
                      loading="lazy"
                      decoding="async"
                      onError={(e) => { (e.target as HTMLImageElement).src = fotoColor }}
                    />
                  </button>
                ) : (
                  <span
                    className="w-12 h-12 rounded-xl shrink-0 border border-black/10 shadow-sm"
                    style={{ backgroundColor: colorToCss(f.color) }}
                    aria-hidden="true"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-sm leading-tight ${sinStock ? 'line-through text-muted-foreground' : ''}`}>
                    {colorEnEs(f.color)}
                  </p>
                  {sinStock ? (
                    <p className="text-xs text-muted-foreground">Sin stock</p>
                  ) : disponible <= 3 ? (
                    <p className="text-xs font-semibold" style={{ color: '#ea580c' }}>🔥 Últimas unidades</p>
                  ) : descuento > 0 ? (
                    <p className="text-xs">
                      <span className="line-through text-muted-foreground mr-1">{fmtARS(precioBase)}</span>
                      <span className="font-semibold" style={{ color: '#4ade80' }}>{fmtARS(precio)}/kg</span>
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">{fmtARS(precio)}/kg</p>
                  )}
                </div>

                <PinComparadorButton f={f} fotoColor={fotoColor} />

                {sinStock ? (
                  <button
                    onClick={() => handleAvisar(f.id)}
                    disabled={yaAlertado || cargandoAlerta}
                    className="shrink-0 flex items-center justify-center gap-1 text-[11px] font-semibold px-3 py-2 min-h-[36px] rounded-xl border transition-colors disabled:cursor-default"
                    style={yaAlertado
                      ? { backgroundColor: 'oklch(0.26 0.04 145)', borderColor: '#166534', color: '#4ade80' }
                      : cargandoAlerta
                        ? { backgroundColor: 'oklch(0.26 0.005 264)', borderColor: 'oklch(1 0 0 / 15%)', color: 'oklch(0.70 0.006 264)' }
                        : { backgroundColor: '#7c3aed', borderColor: '#6d28d9', color: '#ffffff' }
                    }
                  >
                    {yaAlertado
                      ? <><BellOff size={11} /> Anotado</>
                      : cargandoAlerta
                        ? <><Loader2 size={11} className="animate-spin" /> Guardando</>
                        : <><Bell size={11} /> Avisame</>}
                  </button>
                ) : enCart === 0 ? (
                  <button
                    onClick={() => addToCart(f)}
                    className="shrink-0 flex items-center gap-1 text-white text-sm font-bold px-4 py-2 min-h-[44px] rounded-xl"
                    style={{ backgroundColor: '#15803d' }}
                  >
                    <Plus size={14} /> Agregar
                  </button>
                ) : (
                  <div className="shrink-0 flex items-center gap-1">
                    <button
                      onClick={() => setRollos(f.id, enCart - 1)}
                      className="w-11 h-11 flex items-center justify-center rounded-md border border-border hover:bg-secondary"
                      aria-label={`Restar 1 kg de ${colorEnEs(f.color)}`}
                    ><Minus size={14} /></button>
                    <span className="text-sm font-bold w-9 text-center">{enCart} kg</span>
                    <button
                      onClick={() => setRollos(f.id, enCart + 1)}
                      disabled={enMax}
                      className="w-11 h-11 flex items-center justify-center rounded-md border border-border hover:bg-secondary disabled:opacity-30"
                      aria-label={`Sumar 1 kg de ${colorEnEs(f.color)}`}
                    ><Plus size={14} /></button>
                    <button
                      onClick={() => removeFromCart(f.id)}
                      className="w-11 h-11 ml-1 flex items-center justify-center rounded-md hover:bg-red-50 hover:text-red-600 text-muted-foreground"
                      aria-label={`Quitar ${colorEnEs(f.color)} del carrito`}
                    ><Trash2 size={14} /></button>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Barra sticky inferior: shortcut al checkout sin cerrar y abrir el drawer.
            Aparece solo si ya hay items en el carrito para no competir con el
            botón "Agregar" del color cuando está vacío. */}
        {totalKgCart > 0 && (
          <div
            className="sticky bottom-0 left-0 right-0 bg-background border-t border-border px-4 py-3 flex items-center gap-3 shadow-[0_-8px_20px_rgba(0,0,0,0.3)]"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
          >
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground leading-none">{totalKgCart} kg en el carrito</p>
              <p className="text-base font-black leading-tight">{fmtARS(totalCart)}</p>
            </div>
            <button
              type="button"
              onClick={() => { onClose(); onPayNow() }}
              className="shrink-0 flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl px-4 py-3 text-sm font-bold"
            >
              Pagar ahora →
            </button>
          </div>
        )}
      </div>
    </div>
    </>
  )
}

// ── Componente tarjeta de filamento ───────────────────────────────────────────

function FilamentoCard({
  f, enCart, onAdd, onSetRollos, precioUnitario, descuento, index,
}: {
  f: Filamento
  enCart: number
  onAdd: () => void
  onSetRollos: (n: number) => void
  precioUnitario: number
  descuento: number
  index: number
}) {
  const disponible = maxKg(f)
  const enMax = enCart >= disponible
  const css = colorToCss(f.color)
  const isLight = colorIsLight(css)
  const isWhite = f.color.toLowerCase().includes('white')
  const fotos = [f.imagen_url, f.imagen_url_2, f.imagen_url_3].filter(Boolean) as string[]
  const [fotoIdx, setFotoIdx] = useState(0)
  const [lightbox, setLightbox] = useState(false)
  const [showMatInfo, setShowMatInfo] = useState(false)
  const [imgLoaded, setImgLoaded] = useState(false)
  const preloaded = useRef(false)
  const fotoActual = fotos[fotoIdx] ?? null
  const isPriority = index < 6  // primeros 6 cargan eager sin spinner

  // Precargar fotos del carousel solo cuando el usuario interactúa con la card
  const preloadFotos = useCallback(() => {
    if (preloaded.current || fotos.length <= 1) return
    preloaded.current = true
    fotos.forEach((url, i) => {
      if (i === fotoIdx) return
      const img = new window.Image()
      img.src = url
    })
  }, [fotos, fotoIdx])

  return (
    <>
    {lightbox && <Lightbox fotos={fotos} startIdx={fotoIdx} onClose={() => setLightbox(false)} />}
    <div
      className={`rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow border ${enCart > 0 ? 'ring-1' : ''}`}
      style={{
        backgroundColor: 'oklch(0.26 0.005 264)',
        borderColor: enCart > 0 ? '#15803d' : 'oklch(1 0 0 / 10%)',
        ...(enCart > 0 ? { boxShadow: '0 0 0 1px #15803d44' } : {}),
      }}
    >

      {/* ── Área de imagen / carousel ── */}
      <div
        className="relative h-40 flex items-center justify-center overflow-hidden select-none"
        style={fotoActual ? {} : {
          backgroundColor: css,
          backgroundImage: `radial-gradient(circle at 30% 30%, ${isLight ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.12)'} 0%, transparent 60%)`,
          ...(isWhite ? { border: '1px solid #e5e7eb' } : {}),
        }}
        onMouseEnter={preloadFotos}
        onTouchStart={preloadFotos}
      >
        {fotoActual ? (
          <>
            {/* Skeleton de color mientras carga — desaparece al cargar la imagen */}
            {!imgLoaded && (
              <div
                className="absolute inset-0 z-0"
                style={{
                  backgroundColor: css,
                  backgroundImage: `radial-gradient(circle at 30% 30%, ${isLight ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)'} 0%, transparent 60%)`,
                }}
              />
            )}
            <Image
              key={fotoActual}
              src={fotoActual}
              alt={`${colorEnEs(f.color)} ${f.material} - foto ${fotoIdx + 1}`}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className={`object-cover transition-opacity duration-300 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
              priority={isPriority}
              onLoad={() => setImgLoaded(true)}
            />
            {/* Lupa chica para abrir el lightbox — el tap sobre la imagen ya
                NO abre el zoom (confundía a usuarios que querían agregar). */}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setLightbox(true) }}
              aria-label="Ver imagen grande"
              className="absolute top-2 left-2 z-10 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur-sm"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </button>
          </>
        ) : (
          <span
            className="w-16 h-16 rounded-full shadow-lg border-4"
            style={{
              backgroundColor: css,
              borderColor: isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.3)',
              filter: 'brightness(0.92) saturate(1.1)',
            }}
          />
        )}

        {/* Flechas del carousel */}
        {fotos.length > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setImgLoaded(false); setFotoIdx((fotoIdx - 1 + fotos.length) % fotos.length) }}
              className="absolute left-1 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur-sm transition-colors"
              aria-label="Foto anterior"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M8 2L4 6l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setImgLoaded(false); setFotoIdx((fotoIdx + 1) % fotos.length) }}
              className="absolute right-1 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur-sm transition-colors"
              aria-label="Foto siguiente"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>

            {/* Dots */}
            <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5 z-10">
              {fotos.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setFotoIdx(i) }}
                  className={`rounded-full transition-all duration-200 ${i === fotoIdx ? 'w-4 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/50 hover:bg-white/80'}`}
                  aria-label={`Foto ${i + 1}`}
                />
              ))}
            </div>
          </>
        )}

        {/* Stock badge — ocultamos la cantidad; mostramos solo fueguito como gancho.
            Cuando no hay stock, marcamos "sin stock" claro. */}
        {disponible <= 0 ? (
          <span
            className="absolute top-2.5 right-2.5 text-[10px] font-bold px-2 py-0.5 rounded-full z-10 bg-red-700 text-white"
            aria-label="Sin stock"
          >
            sin stock
          </span>
        ) : (
          <span
            className="absolute top-2.5 right-2.5 text-sm px-1.5 py-0.5 rounded-full z-10"
            style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
            aria-label={disponible <= 3 ? 'Últimas unidades' : 'Disponible'}
            title={disponible <= 3 ? 'Últimas unidades' : 'Disponible'}
          >
            🔥
          </span>
        )}

        {/* Indicador en carrito */}
        {enCart > 0 && (
          <span className="absolute bottom-2 right-2 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full z-10" style={{ backgroundColor: '#15803d' }}>
            {enCart} kg
          </span>
        )}
      </div>

      {/* ── Información ── */}
      <div className="p-3.5 flex flex-col gap-2.5">
        <p className="font-bold text-sm leading-tight">{colorEnEs(f.color)}</p>
        <p className="text-xs text-muted-foreground leading-tight -mt-1.5">{f.nombre}</p>

        <div className="flex items-center justify-between gap-2">
          <div>
            {descuento > 0 && f.precio_kg != null ? (
              <>
                <p className="text-xs text-muted-foreground line-through leading-none">{fmtARS(f.precio_kg)}</p>
                <p className="text-lg font-black leading-none" style={{ color: '#4ade80' }}>{fmtARS(precioUnitario)}</p>
                <p className="text-xs font-semibold" style={{ color: '#4ade80' }}>−{fmtARS(descuento)}/kg</p>
              </>
            ) : (
              <>
                <p className="text-lg font-black text-foreground leading-none">{fmtARS(precioUnitario)}</p>
                <p className="text-xs text-muted-foreground">1 kilo = 1 rollo entero</p>
              </>
            )}
          </div>
          <div className="relative shrink-0">
            <button
              type="button"
              className="text-xs font-black px-2.5 py-1 rounded-full inline-flex items-center gap-0.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-400"
              style={{ backgroundColor: MAT_COLORS[f.material] ?? '#94a3b8', color: '#fff' }}
              onMouseEnter={() => setShowMatInfo(true)}
              onMouseLeave={() => setShowMatInfo(false)}
              onClick={(e) => { e.stopPropagation(); setShowMatInfo(v => !v) }}
              aria-expanded={showMatInfo}
              aria-label={`¿Qué es ${f.material}? Tocá para saber más`}
            >
              {f.material}
              <span aria-hidden="true" className="text-[10px] opacity-80">ⓘ</span>
            </button>
            {showMatInfo && MAT_INFO[f.material] && (
              <>
                {/* Click fuera para cerrar en mobile (sin hover) */}
                <div className="fixed inset-0 z-[19]" onClick={(e) => { e.stopPropagation(); setShowMatInfo(false) }} aria-hidden="true" />
                <div
                  role="tooltip"
                  className="absolute bottom-full right-0 mb-1.5 w-56 text-xs leading-snug bg-popover border border-border rounded-xl px-3 py-2.5 shadow-xl z-20 text-left font-normal"
                  style={{ color: 'oklch(0.85 0.005 264)' }}
                >
                  <strong className="block mb-1" style={{ color: 'oklch(0.95 0 0)' }}>{f.material}</strong>
                  {MAT_INFO[f.material]}
                </div>
              </>
            )}
          </div>
        </div>

        {/* CTA */}
        {enCart === 0 ? (
          <button
            onClick={onAdd}
            disabled={disponible === 0}
            className="w-full flex items-center justify-center gap-1.5 text-white text-sm font-bold py-2.5 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#15803d' }}
          >
            <Plus size={14} />
            Agregar al carrito
          </button>
        ) : (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <button
                onClick={() => onSetRollos(enCart - 1)}
                className="flex-none w-11 h-11 flex items-center justify-center rounded-lg border border-border hover:bg-secondary transition-colors"
                aria-label={`Restar 1 kg de ${colorEnEs(f.color)}`}
              >
                <Minus size={16} />
              </button>
              <span className="flex-1 text-center text-base font-bold">{enCart} kg</span>
              <button
                onClick={() => onSetRollos(enCart + 1)}
                disabled={enMax}
                className="flex-none w-11 h-11 flex items-center justify-center rounded-lg border border-border hover:bg-secondary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label={`Sumar 1 kg de ${colorEnEs(f.color)}`}
              >
                <Plus size={16} />
              </button>
            </div>
            {enMax && (
              <p className="text-xs text-center text-amber-600 dark:text-amber-400 font-semibold">
                Stock máximo ({disponible} kg)
              </p>
            )}
          </div>
        )}
      </div>
    </div>
    </>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

type SortOption = 'destacados' | 'stock' | 'az' | 'material' | 'precio'

// Rank interno para el sort "destacados": los básicos (negro, blanco, gris)
// primero, después el resto por stock. Pensado para el comprador apurado que
// busca el color default de su impresora.
function destacadosRank(color: string): number {
  const c = color.toLowerCase()
  if (c.includes('black') || c.includes('negro')) return 0
  if (c.includes('white') || c.includes('blanco')) return 1
  if (c.includes('grey') || c.includes('gray') || c.includes('gris')) return 2
  return 10
}

export default function FilamentosShop({
  filamentos,
  agotados = [],
  alertasIniciales = [],
  initialUser,
  membresia: initialMembresia,
  saldoCoins = 0,
}: {
  filamentos: Filamento[]
  agotados?: Filamento[]
  alertasIniciales?: string[]
  initialUser?: User | null
  membresia?: MembresiaStatus | null
  saldoCoins?: number
}) {
  const [cart, setCart] = useState<CartItem[]>([])
  const [showCart, setShowCart] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const cartDrawerRef = useRef<HTMLDivElement>(null)
  const checkoutPanelRef = useRef<HTMLDivElement>(null)
  const [search, setSearch] = useState('')
  const [matFilter, setMatFilter] = useState<string>('')
  const [marcaFilter, setMarcaFilter] = useState<string>('')
  const [colorFilter, setColorFilter] = useState<string>('')
  const [sortBy, setSortBy] = useState<SortOption>('destacados')
  const [misAlertas, setMisAlertas] = useState<string[]>(alertasIniciales)
  const [alertando, setAlertando] = useState<string | null>(null)
  const [alertToast, setAlertToast] = useState(false)
  const [stockRemovedNames, setStockRemovedNames] = useState<string[]>([])
  const [sugerenciaMensaje, setSugerenciaMensaje] = useState('')
  const [sugerenciaEnviada, setSugerenciaEnviada] = useState(false)
  const [sugerenciaEnviando, setSugerenciaEnviando] = useState(false)

  const [showCheckout, setShowCheckout] = useState(false)
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>('form')
  useFocusTrap(checkoutPanelRef, showCheckout)
  const [puntosACanjear, setPuntosACanjear] = useState(0)
  const [clienteNombre, setClienteNombre] = useState(
    initialUser?.user_metadata?.full_name ? String(initialUser.user_metadata.full_name) : ''
  )
  const [clienteTelefono, setClienteTelefono] = useState('')
  // Pre-fill guest: si en una visita anterior ya cargó nombre/teléfono, los
  // recuperamos de localStorage para que el apurado no los retipee.
  useEffect(() => {
    if (initialUser) return
    try {
      const n = localStorage.getItem('ddd_guest_nombre')
      const t = localStorage.getItem('ddd_guest_telefono')
      if (n && !clienteNombre) setClienteNombre(n)
      if (t && !clienteTelefono) setClienteTelefono(t)
    } catch { /* noop */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const [pedidoNumero, setPedidoNumero] = useState<number | null>(null)
  const [checkoutError, setCheckoutError] = useState('')
  // Tras 6 s de "saving" cambiamos el label a "la red está lenta" para que
  // el usuario sepa que seguimos vivos. No altera el flujo: el idempotency
  // key cubre un reintento si el server ya recibió el pedido.
  const [submitSlow, setSubmitSlow] = useState(false)
  const submitSlowTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (submitSlowTimer.current) clearTimeout(submitSlowTimer.current) }, [])
  // Idempotency key: UUID por intento de checkout. Se regenera cada vez que se
  // abre el checkout. Un retry del mismo intento (misma apertura) reusa el key
  // para que el server deduplique vía filamento_pedidos_idempotency_key_uq.
  const [idempotencyKey, setIdempotencyKey] = useState<string>(generarIdempotencyKey)
  const [pedidoSnapshot, setPedidoSnapshot] = useState<{ items: (typeof cart[0] & { precioUnitario: number })[]; kg: number; subtotal: number; descuento: number; descLabel: string } | null>(null)
  const [isPending, startTransition] = useTransition()
  const [localFilamentos, setLocalFilamentos] = useState(filamentos)
  // Re-sincronizar cuando el server devuelve stock actualizado (otro cliente compró, admin cambió precio, etc).
  useEffect(() => { setLocalFilamentos(filamentos) }, [filamentos])

  // Focus trap sobre el drawer del carrito. El de checkout está más abajo
  // (después de declarar showCheckout).
  useFocusTrap(cartDrawerRef, showCart)

  // Escape cierra el carrito, el checkout (si está en form) y el panel de filtros
  useEffect(() => {
    if (!showCart && !showFilters && !showCheckout) return
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      // Prioridad: checkout > carrito > filtros (lo que está "arriba" primero)
      if (showCheckout && checkoutStep === 'form') { setShowCheckout(false); setPuntosACanjear(0) }
      else if (showCart) setShowCart(false)
      else if (showFilters) setShowFilters(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showCart, showFilters, showCheckout, checkoutStep])
  // Mantener una ref actualizada para que closures (auth listener) usen el valor vigente.
  const localFilamentosRef = useRef(localFilamentos)
  useEffect(() => { localFilamentosRef.current = localFilamentos }, [localFilamentos])

  // Si la URL trae ?openCart=1 (viene del icono del header cuando hay filamentos),
  // abrimos el drawer y limpiamos el query para que no se reabra al compartir el link.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (params.get('openCart') === '1') {
      setShowCart(true)
      params.delete('openCart')
      const q = params.toString()
      const url = window.location.pathname + (q ? `?${q}` : '') + window.location.hash
      window.history.replaceState({}, '', url)
    }
  }, [])

  // El icono del header dispara este evento cuando estamos en /filamentos para
  // abrir el drawer sin recargar la página. Si no estamos en /filamentos,
  // el header navega a /filamentos?openCart=1 y el efecto de arriba lo abre.
  useEffect(() => {
    if (typeof window === 'undefined') return
    function onOpen() { setShowCart(true) }
    window.addEventListener('ddd:openCart', onOpen)
    return () => window.removeEventListener('ddd:openCart', onOpen)
  }, [])
  const cartRef = useRef(cart)
  useEffect(() => { cartRef.current = cart }, [cart])

  const [user, setUser] = useState<User | null>(initialUser ?? null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  // Flag para colapsar la tarjeta "¿Entrar con Google?" del checkout si el
  // usuario ya la descartó antes. Persistido en localStorage.
  const [googleDismissed, setGoogleDismissed] = useState(false)
  useEffect(() => {
    try { if (localStorage.getItem('ddd_google_dismissed') === '1') setGoogleDismissed(true) } catch { /* noop */ }
  }, [])
  const [membresia, setMembresia] = useState<MembresiaStatus | null>(initialMembresia ?? null)
  const cartSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const alertToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Flag para reabrir el checkout después del login si el usuario venía intentando confirmar
  const postLoginIntentRef = useRef<'checkout' | null>(null)
  useEffect(() => () => { if (alertToastTimerRef.current) clearTimeout(alertToastTimerRef.current) }, [])
  const { setFilamentCount } = useCart()

  // Sincronizar count de items con CartProvider para el badge del header.
  // Sin cleanup intermedio: el cleanup corría antes de cada update y causaba
  // flicker a 0 visible en el badge entre + y - rápidos.
  useEffect(() => {
    setFilamentCount(cart.reduce((s, i) => s + i.rollos, 0))
  }, [cart, setFilamentCount])
  // No reseteamos a 0 en unmount: cuando el usuario navega a /carrito u otra
  // ruta, el carrito sigue vivo en localStorage/DB y el badge debe reflejarlo.

  // Persistir carrito anónimo en localStorage continuamente
  useEffect(() => {
    if (user) return // usuarios logueados usan DB
    try {
      if (cart.length > 0) {
        localStorage.setItem('ddd_cart_filamentos', JSON.stringify(cart))
      } else {
        localStorage.removeItem('ddd_cart_filamentos')
      }
    } catch { /* noop */ }
  }, [cart, user]) // eslint-disable-line react-hooks/exhaustive-deps

  // Item 5 — Debounced save del carrito a la DB cuando cambia
  useEffect(() => {
    if (!user) return
    if (cartSaveTimer.current) clearTimeout(cartSaveTimer.current)
    cartSaveTimer.current = setTimeout(() => {
      import('@/lib/actions/filamentos').then(({ saveCarritoUsuario }) => {
        saveCarritoUsuario(cart.map(i => ({ filamento_id: i.filamento.id, rollos: i.rollos })))
      })
    }, 2000)
    return () => { if (cartSaveTimer.current) clearTimeout(cartSaveTimer.current) }
  }, [cart, user]) // eslint-disable-line react-hooks/exhaustive-deps

  // Restore cart on mount:
  //  - Si hay usuario inicial (SSR con sesión), cargamos de DB directamente.
  //    Antes solo se cargaba cuando onAuthStateChange se disparaba, y ese
  //    event NO se emite en el mount si la sesión ya estaba activa —
  //    resultado: usuarios logueados abrían la página y el carrito "no cargaba".
  //  - Si no hay usuario (anónimo), restauramos del localStorage.
  useEffect(() => {
    if (initialUser) {
      import('@/lib/actions/filamentos').then(({ getCarritoUsuario }) => {
        getCarritoUsuario().then(savedItems => {
          if (!savedItems.length) return
          setCart(prev => {
            if (prev.length > 0) return prev
            const current = localFilamentosRef.current
            const removed: string[] = []
            const restored = savedItems.flatMap(item => {
              const fil = current.find(f => f.id === item.filamento_id)
              if (!fil) return []
              const max = maxKg(fil)
              if (max <= 0) { removed.push(fil.color || fil.nombre); return [] }
              return [{ filamento: fil, rollos: Math.min(item.rollos, max) }]
            })
            if (removed.length) setStockRemovedNames(removed)
            return restored
          })
        }).catch(() => { /* noop */ })
      })
      // También limpiamos el localStorage anónimo si quedó colgado
      try { localStorage.removeItem('ddd_cart_filamentos') } catch { /* noop */ }
      return
    }

    // Anónimo: restaurar de localStorage
    try {
      const saved = localStorage.getItem('ddd_cart_filamentos')
      if (saved) {
        const parsed: CartItem[] = JSON.parse(saved)
        if (parsed.length > 0) {
          setCart(prev => {
            if (prev.length > 0) return prev
            const current = localFilamentosRef.current
            return parsed.flatMap(item => {
              const fil = current.find(f => f.id === item.filamento.id)
              if (!fil) return []
              const max = maxKg(fil)
              if (max <= 0) return []
              return [{ ...item, filamento: fil, rollos: Math.min(item.rollos, max) }]
            })
          })
        }
      }
    } catch { /* noop */ }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Flush del carrito a DB al cerrar/cambiar de página. Evita perder cambios
  // hechos dentro de los 2s del debounce si el usuario navega rápido.
  useEffect(() => {
    if (!user) return
    const flush = () => {
      if (cartSaveTimer.current) clearTimeout(cartSaveTimer.current)
      // sendBeacon / fetch keepalive: el browser garantiza que el request sale
      // aunque la tab se cierre inmediatamente. Los server actions no lo hacen.
      try {
        const payload = JSON.stringify({
          items: cartRef.current.map(i => ({ filamento_id: i.filamento.id, rollos: i.rollos })),
        })
        const blob = new Blob([payload], { type: 'application/json' })
        const ok = typeof navigator.sendBeacon === 'function'
          && navigator.sendBeacon('/api/carrito-save', blob)
        if (!ok) {
          fetch('/api/carrito-save', {
            method: 'POST',
            body: payload,
            headers: { 'content-type': 'application/json' },
            keepalive: true,
          }).catch(() => { /* noop */ })
        }
      } catch { /* noop */ }
    }
    window.addEventListener('pagehide', flush)
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flush()
    })
    return () => {
      window.removeEventListener('pagehide', flush)
    }
  }, [user])

  // "Repetir pedido" intent: si vino de /cuenta con un pedido anterior, pre-armamos
  // el carrito con los mismos filamentos validando stock. Avisamos lo que no se pudo.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('ddd_repetir_pedido')
      if (!raw) return
      sessionStorage.removeItem('ddd_repetir_pedido')
      const intent = JSON.parse(raw) as { items: { filamento_id: string; rollos: number }[]; numero_origen: number }
      if (!intent?.items?.length) return

      const nuevosItems: CartItem[] = []
      const faltantes: string[] = []
      for (const it of intent.items) {
        const fil = localFilamentos.find(f => f.id === it.filamento_id)
        if (!fil) { faltantes.push(it.filamento_id); continue }
        const max = maxKg(fil)
        if (max <= 0) { faltantes.push(fil.color ?? fil.id); continue }
        nuevosItems.push({ filamento: fil, rollos: Math.min(it.rollos, max) })
      }
      if (nuevosItems.length > 0) {
        setCart(nuevosItems)
        setShowCart(true)
      }
      if (faltantes.length > 0) {
        setStockRemovedNames(faltantes.slice(0, 3))
      }
    } catch { /* noop */ }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      const u = session?.user ?? null
      setUser(u)
      if (u?.user_metadata?.full_name) {
        setClienteNombre(prev => prev || String(u.user_metadata.full_name))
      }
      if (u) {
        setShowAuthModal(false)
        // Si venía intentando confirmar el pedido, reabrir el checkout
        if (postLoginIntentRef.current === 'checkout') {
          postLoginIntentRef.current = null
          setShowCheckout(true)
          setCheckoutStep('form')
          setCheckoutError('')
          setPedidoNumero(null)
          setPuntosACanjear(0)
        }
        // Limpiar carrito anónimo de localStorage — ahora usa DB
        try { localStorage.removeItem('ddd_cart_filamentos') } catch { /* noop */ }
        // Fetch membership for newly logged-in user
        import('@/lib/actions/filamento-pedidos').then(({ getMembresiaCliente }) => {
          getMembresiaCliente(u.id).then(setMembresia)
        })
        // Item 5 — Cargar carrito guardado en DB (solo si el carrito actual está vacío)
        import('@/lib/actions/filamentos').then(({ getCarritoUsuario }) => {
          getCarritoUsuario().then(savedItems => {
            if (savedItems.length === 0) return
            setCart(prev => {
              if (prev.length > 0) return prev
              const removed: string[] = []
              // Usar ref para captar el stock vigente al momento del callback,
              // no el del primer render del componente.
              const filamentosActuales = localFilamentosRef.current
              const restored = savedItems.flatMap(item => {
                const fil = filamentosActuales.find(f => f.id === item.filamento_id)
                if (!fil) return []
                const max = maxKg(fil)
                if (max <= 0) { removed.push(fil.color || fil.nombre); return [] }
                return [{ filamento: fil, rollos: Math.min(item.rollos, max) }]
              })
              if (removed.length) setStockRemovedNames(removed)
              return restored
            })
          })
        })
      } else {
        setMembresia(null)
      }
    })
    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Prefetch images in background after viewport loads
  useEffect(() => {
    if (!localFilamentos.length) return
    const idle = typeof requestIdleCallback !== 'undefined'
      ? (fn: () => void) => requestIdleCallback(fn, { timeout: 3000 })
      : (fn: () => void) => setTimeout(fn, 50)

    // Only prefetch the first 6 filaments (those with priority load) to avoid burning mobile data
    const queue = localFilamentos.slice(0, 6).flatMap(f =>
      [f.imagen_url, f.imagen_url_2, f.imagen_url_3].filter(Boolean) as string[]
    ).map(u => imgUrl(u, 1200, 90))

    let i = 0
    let timer: ReturnType<typeof setTimeout>

    function next() {
      if (i >= queue.length) return
      new window.Image().src = queue[i++]
      idle(next)
    }

    timer = setTimeout(() => idle(next), 2000)
    return () => clearTimeout(timer)
  }, [localFilamentos]) // eslint-disable-line react-hooks/exhaustive-deps

  const marcas = useMemo(() => Array.from(new Set(localFilamentos.map(f => f.marca))).sort(), [localFilamentos])
  const materiales = useMemo(() => Array.from(new Set(localFilamentos.map(f => f.material))).sort(), [localFilamentos])

  // Grupos de color para el filtro visual
  const COLOR_GRUPOS: { label: string; keywords: string[]; css: string }[] = [
    { label: 'Negro',    keywords: ['black', 'negro'],                          css: '#1a1a1a' },
    { label: 'Blanco',   keywords: ['white', 'blanco'],                         css: '#e8e8e8' },
    { label: 'Gris',     keywords: ['grey', 'gray', 'gris'],                    css: '#9ca3af' },
    { label: 'Rojo',     keywords: ['red', 'vermilion', 'ruby', 'rojo', 'berry'], css: '#ef4444' },
    { label: 'Naranja',  keywords: ['orange', 'naranja'],                       css: '#f97316' },
    { label: 'Amarillo', keywords: ['yellow', 'sunshine', 'amarillo'],          css: '#eab308' },
    { label: 'Verde',    keywords: ['green', 'verde', 'olive', 'teal'],         css: '#22c55e' },
    { label: 'Azul',     keywords: ['blue', 'azul'],                            css: '#3b82f6' },
    { label: 'Violeta',  keywords: ['purple', 'violet', 'taro', 'violeta'],     css: '#a855f7' },
    { label: 'Rosa',     keywords: ['pink', 'rosa'],                            css: '#ec4899' },
    { label: 'Marrón',   keywords: ['brown', 'madera'],                         css: '#92400e' },
    { label: 'Dorado',   keywords: ['gold', 'silk', 'dorado'],                  css: '#d97706' },
  ]

  const coloresDisponibles = useMemo(() => {
    const base = matFilter ? localFilamentos.filter(f => f.material === matFilter) : localFilamentos
    return COLOR_GRUPOS.filter(g =>
      base.some(f => g.keywords.some(k => f.color.toLowerCase().includes(k)))
    )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localFilamentos, matFilter])

  const normalizeStr = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

  const applyFilters = (list: Filamento[]) => {
    if (matFilter) list = list.filter(f => f.material === matFilter)
    if (marcaFilter) list = list.filter(f => f.marca === marcaFilter)
    if (colorFilter) {
      const grupo = COLOR_GRUPOS.find(g => g.label === colorFilter)
      if (grupo) list = list.filter(f => grupo.keywords.some(k => f.color.toLowerCase().includes(k)))
    }
    if (search.trim()) {
      const q = normalizeStr(search.trim())
      // Expandir con sinónimos bilingüe: si el query coincide con algún keyword de un grupo de color,
      // buscar también con el resto de keywords de ese grupo (ej: "rojo" → también "red", "vermilion"...)
      const grupoMatch = COLOR_GRUPOS.find(g => g.keywords.some(k => normalizeStr(k).includes(q) || q.includes(normalizeStr(k))))
      const terms = grupoMatch ? [q, ...grupoMatch.keywords.map(normalizeStr)] : [q]
      list = list.filter(f =>
        terms.some(t =>
          normalizeStr(f.color).includes(t) ||
          normalizeStr(f.nombre).includes(t) ||
          normalizeStr(f.marca).includes(t)
        )
      )
    }
    return list
  }

  const filtered = useMemo(() => {
    let list = applyFilters([...localFilamentos])
    if (sortBy === 'az') list.sort((a, b) => a.color.localeCompare(b.color, 'es'))
    else if (sortBy === 'material') list.sort((a, b) => a.material.localeCompare(b.material, 'es') || a.color.localeCompare(b.color, 'es'))
    else if (sortBy === 'precio') list.sort((a, b) => (a.precio_kg ?? 0) - (b.precio_kg ?? 0))
    else if (sortBy === 'stock') list.sort((a, b) => (b.rollos_cerrados * b.peso_rollo_gr + b.gramos_sueltos) - (a.rollos_cerrados * a.peso_rollo_gr + a.gramos_sueltos))
    else list.sort((a, b) => {
      // destacados: básicos primero (ranking), después por stock disponible
      const ra = destacadosRank(a.color), rb = destacadosRank(b.color)
      if (ra !== rb) return ra - rb
      return (b.rollos_cerrados * b.peso_rollo_gr + b.gramos_sueltos) - (a.rollos_cerrados * a.peso_rollo_gr + a.gramos_sueltos)
    })
    return list
  }, [localFilamentos, matFilter, marcaFilter, colorFilter, search, sortBy]) // eslint-disable-line react-hooks/exhaustive-deps

  const agotadosFiltrados = useMemo(
    () => applyFilters([...agotados]),
    [agotados, matFilter, marcaFilter, colorFilter, search] // eslint-disable-line react-hooks/exhaustive-deps
  )

  // Agrupación por marca + material. Cada grupo colapsa los colores en una sola
  // card; al abrirla se ve el detalle de todos los colores.
  // Clave: "marca||material". Un grupo contiene filamentos con y sin stock.
  // Un grupo entra en el listado principal si TIENE al menos un color con stock;
  // si no, va al listado "sin stock por ahora" con el botón de alerta.
  const grupos = useMemo(() => {
    type Grupo = { key: string; marca: string; material: string; filamentos: Filamento[] }
    const todos = [...filtered, ...agotadosFiltrados]
    const map = new Map<string, Grupo>()
    for (const f of todos) {
      const key = `${f.marca}||${f.material}`
      let g = map.get(key)
      if (!g) {
        g = { key, marca: f.marca, material: f.material, filamentos: [] }
        map.set(key, g)
      }
      if (!g.filamentos.find(x => x.id === f.id)) g.filamentos.push(f)
    }
    const activos: Grupo[] = []
    const agotadosG: Grupo[] = []
    for (const g of map.values()) {
      const hayStock = g.filamentos.some(f => maxKg(f) > 0)
      // Orden interno: con stock primero, dentro de cada subgrupo por color alfabético
      g.filamentos.sort((a, b) => {
        const sa = maxKg(a) > 0 ? 0 : 1
        const sb = maxKg(b) > 0 ? 0 : 1
        if (sa !== sb) return sa - sb
        return a.color.localeCompare(b.color, 'es')
      })
      ;(hayStock ? activos : agotadosG).push(g)
    }
    const sortByMarca = (a: Grupo, b: Grupo) =>
      a.marca.localeCompare(b.marca, 'es') || a.material.localeCompare(b.material, 'es')

    // Si el sort es "destacados", ordenamos los grupos por el mejor rank
    // de sus colores con stock. Si un grupo tiene "Negro" en stock, aparece
    // primero aunque su marca empiece con "Z". Para los otros sorts, usamos
    // orden alfabético por marca.
    if (sortBy === 'destacados') {
      const grupoRank = (g: Grupo): number => {
        const ranks = g.filamentos
          .filter(f => maxKg(f) > 0)
          .map(f => destacadosRank(f.color))
        return ranks.length ? Math.min(...ranks) : 999
      }
      activos.sort((a, b) => {
        const ra = grupoRank(a), rb = grupoRank(b)
        if (ra !== rb) return ra - rb
        return sortByMarca(a, b)
      })
    } else {
      activos.sort(sortByMarca)
    }
    agotadosG.sort(sortByMarca)
    return { activos, agotados: agotadosG }
  }, [filtered, agotadosFiltrados, sortBy])
  type FilamentoGrupo = typeof grupos.activos[number]

  const [grupoAbierto, setGrupoAbierto] = useState<FilamentoGrupo | null>(null)

  const totalKg = cart.reduce((s, i) => s + i.rollos, 0)
  // kg ya acumulados en el período activo de membresía (0 si no hay membresía o venció)
  const kgAcumulados = membresia?.kgPeriodo ?? 0
  // El tier se calcula sobre el total efectivo: lo que ya compró + lo que está comprando ahora.
  // En trial, se fuerza el mínimo para que siempre aplique el descuento Mayorista.
  const kgEfectivo = membresia?.esTrial ? Math.max(5, kgAcumulados + totalKg) : kgAcumulados + totalKg
  const { descuento, label: descLabel } = getDescuento(kgEfectivo)
  const subtotal = cart.reduce((s, i) => s + i.rollos * ((i.filamento.precio_kg ?? PRECIO_BASE_DEFAULT) - descuento), 0)
  const precioUnitarioPromedio = totalKg > 0 ? Math.round(subtotal / totalKg) : PRECIO_BASE_DEFAULT - descuento

  function loginConCarrito() {
    try { localStorage.setItem('ddd_cart_filamentos', JSON.stringify(cart)) } catch { /* noop */ }
    signInWithGoogleAndReturn('/filamentos')
  }

  // Throttle para evitar que un doble-tap en 3G sume 2 kg sin querer.
  const lastAddRef = useRef<{ id: string; ts: number } | null>(null)
  // Set de ids que están en "cooldown" visual (350 ms) para dar feedback de
  // "ya te escuché, no retoques". Solo cosmético — la lógica la cubre el
  // throttle ref de arriba.
  const [addCooldown, setAddCooldown] = useState<Set<string>>(new Set())
  // Toast local "✓ Agregado: 1 kg Negro" para dar feedback táctil visible,
  // especialmente en el modal del grupo donde la card no cambia de posición.
  const [addToast, setAddToast] = useState<string | null>(null)
  const addToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (addToastTimerRef.current) clearTimeout(addToastTimerRef.current) }, [])

  function addToCart(f: Filamento) {
    const now = Date.now()
    const last = lastAddRef.current
    if (last && last.id === f.id && now - last.ts < 350) return
    lastAddRef.current = { id: f.id, ts: now }

    const fil = localFilamentos.find(fl => fl.id === f.id) ?? f
    const max = maxKg(fil)
    setCart(prev => {
      const existing = prev.find(i => i.filamento.id === f.id)
      if (existing) {
        if (existing.rollos >= max) return prev
        return prev.map(i => i.filamento.id === f.id ? { ...i, rollos: i.rollos + 1 } : i)
      }
      return [...prev, { filamento: f, rollos: 1 }]
    })
    // Feedback táctil: toast 2s.
    const label = colorEnEs(f.color).split(' · ')[0]
    setAddToast(`✓ Agregado: 1 kg ${label}`)
    if (addToastTimerRef.current) clearTimeout(addToastTimerRef.current)
    addToastTimerRef.current = setTimeout(() => setAddToast(null), 2000)
    // Feedback visual: el id queda en cooldown 350 ms (misma ventana que el
    // throttle). El botón/swatch puede leer `addCooldown.has(f.id)` para
    // bajarse la opacidad brevemente — así el usuario sabe que el tap llegó.
    setAddCooldown(prev => {
      const next = new Set(prev); next.add(f.id); return next
    })
    setTimeout(() => {
      setAddCooldown(prev => {
        if (!prev.has(f.id)) return prev
        const next = new Set(prev); next.delete(f.id); return next
      })
    }, 350)
  }

  function setRollos(id: string, rollos: number) {
    const fil = localFilamentos.find(f => f.id === id) ?? cart.find(i => i.filamento.id === id)?.filamento
    const max = fil ? maxKg(fil) : 999
    if (rollos <= 0) setCart(prev => prev.filter(i => i.filamento.id !== id))
    else setCart(prev => prev.map(i => i.filamento.id === id ? { ...i, rollos: Math.min(rollos, max) } : i))
  }

  async function handleAvisar(filamentoId: string) {
    if (!user) { setShowAuthModal(true); return }
    setAlertando(filamentoId)
    const { suscribirAlertaStock } = await import('@/lib/actions/filamentos')
    const result = await suscribirAlertaStock(filamentoId)
    setAlertando(null)
    if (!result.error) {
      setMisAlertas(prev => [...prev, filamentoId])
      setAlertToast(true)
      if (alertToastTimerRef.current) clearTimeout(alertToastTimerRef.current)
      alertToastTimerRef.current = setTimeout(() => setAlertToast(false), 5000)
    }
  }

  function sortByStock<T extends { rollos_cerrados: number; peso_rollo_gr: number; gramos_sueltos: number }>(arr: T[]): T[] {
    return [...arr].sort((a, b) =>
      (b.rollos_cerrados * b.peso_rollo_gr + b.gramos_sueltos) -
      (a.rollos_cerrados * a.peso_rollo_gr + a.gramos_sueltos)
    )
  }

  async function abrirCarrito() {
    setShowCart(true)
    try {
      const fresh = await getFilamentosDisponibles()
      setLocalFilamentos(sortByStock(fresh))
    } catch { /* noop */ }
    // Revalidar membresía para detectar vencimientos mid-session
    if (user) {
      import('@/lib/actions/filamento-pedidos').then(({ getMembresiaCliente }) => {
        getMembresiaCliente(user.id).then(setMembresia).catch(() => setMembresia(null))
      })
    }
  }

  function removeFromCart(id: string) { setCart(prev => prev.filter(i => i.filamento.id !== id)) }
  function getCartRollos(id: string) { return cart.find(i => i.filamento.id === id)?.rollos ?? 0 }

  // Flag para evitar regenerar el idempotency key mientras una request
  // anterior sigue en vuelo (user cerró el modal sin esperar y lo reabrió).
  // Si regenerásemos, el retry podría duplicar el pedido.
  const pedidoEnVueloRef = useRef(false)

  function abrirCheckout() {
    if (!cart.length) return
    // Rehidrato nombre/teléfono del guest desde localStorage CADA vez que
    // abre el checkout — no solo en el mount — por si limpió campos, cerró
    // el drawer y volvió a abrir.
    if (!user) {
      try {
        const n = localStorage.getItem('ddd_guest_nombre')
        const t = localStorage.getItem('ddd_guest_telefono')
        if (n && !clienteNombre.trim()) setClienteNombre(n)
        if (t && !clienteTelefono.trim()) setClienteTelefono(t)
      } catch { /* noop */ }
    }
    // Solo regeneramos el key si el intento anterior terminó. Si sigue en
    // vuelo, reusamos el mismo key — el server deduplica.
    if (!pedidoEnVueloRef.current) {
      setIdempotencyKey(generarIdempotencyKey())
    }
    setShowCheckout(true); setCheckoutStep('form'); setCheckoutError(''); setPedidoNumero(null); setPuntosACanjear(0)
    // Membresía en paralelo con timeout corto: el modal no se bloquea en red
    // lenta; si no responde en 2.5 s nos quedamos con la cacheada.
    if (user) {
      import('@/lib/actions/filamento-pedidos').then(({ getMembresiaCliente }) => {
        const race = Promise.race<MembresiaStatus | null>([
          getMembresiaCliente(user.id).catch(() => null),
          new Promise<null>(res => setTimeout(() => res(null), 2500)),
        ])
        race.then(mem => { if (mem) setMembresia(mem) })
      })
    }
  }

  function abrirWhatsApp(numero: number) {
    const snap = pedidoSnapshot
    if (!snap) return
    const itemLines = snap.items.map(i =>
      `  - ${i.rollos} kg de ${i.filamento.color} (${i.filamento.material} ${i.filamento.marca})`
    )
    const lines = [
      `Hola, soy ${clienteNombre}!`,
      `Hice el pedido N° ${numero} desde la web.`,
      ``,
      `*Detalle:*`,
      ...itemLines,
      ``,
      `*Total: ${fmtARS(snap.subtotal)}*`,
      snap.descuento > 0 ? `Descuento mayorista aplicado: -${fmtARS(snap.descuento)}/kg` : null,
      ``,
      `Quedo esperando confirmacion para coordinar el pago y la entrega.`,
    ].filter(Boolean).join('\n')
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(lines)}`, '_blank')
  }

  // Primer tap del botón "Hacer el pedido": validamos y pasamos al paso de
  // confirmación con el resumen en grande (pensado para la abuela y para
  // cualquiera que quiera un último "¿estás seguro?" antes de enviar la RPC).
  function handleRevisarPedido() {
    if (!clienteNombre.trim()) { setCheckoutError('Tu nombre es requerido'); return }
    if (!user && !clienteTelefono.trim()) {
      setCheckoutError('Para coordinar la entrega necesitamos tu teléfono')
      return
    }
    setCheckoutError('')
    setCheckoutStep('confirm')
  }

  function handleConfirmarPedido() {
    if (!clienteNombre.trim()) { setCheckoutError('Tu nombre es requerido'); setCheckoutStep('form'); return }
    if (!user && !clienteTelefono.trim()) {
      setCheckoutError('Para coordinar la entrega necesitamos tu teléfono'); setCheckoutStep('form'); return
    }
    setCheckoutError(''); setCheckoutStep('saving')
    setSubmitSlow(false)
    if (submitSlowTimer.current) clearTimeout(submitSlowTimer.current)
    submitSlowTimer.current = setTimeout(() => setSubmitSlow(true), 6000)
    pedidoEnVueloRef.current = true
    startTransition(async () => {
      try {
        const result = await crearPedidoFilamento({
          cliente_nombre: clienteNombre, cliente_telefono: clienteTelefono,
          items: cart.map(i => ({
            filamento_id: i.filamento.id, nombre: i.filamento.nombre, color: i.filamento.color,
            material: i.filamento.material, marca: i.filamento.marca, rollos: i.rollos,
            precio_unitario: i.filamento.precio_kg ?? PRECIO_BASE_DEFAULT,
          })),
          puntosACanjear: puntosACanjear > 0 ? puntosACanjear : undefined,
          idempotencyKey,
        })
        if (result.error) { setCheckoutError(result.error); setCheckoutStep('form'); return }
        // Guardar teléfono en el perfil del usuario si lo ingresó
        if (user && clienteTelefono.trim()) {
          const sb = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
          sb.auth.updateUser({ data: { phone: clienteTelefono.trim() } })
        }
        // Guest: guardamos nombre/teléfono para la próxima compra.
        if (!user) {
          try {
            if (clienteNombre.trim()) localStorage.setItem('ddd_guest_nombre', clienteNombre.trim())
            if (clienteTelefono.trim()) localStorage.setItem('ddd_guest_telefono', clienteTelefono.trim())
          } catch { /* noop */ }
        }
        setPedidoSnapshot({ items: cart.map(i => ({ ...i, precioUnitario: (i.filamento.precio_kg ?? PRECIO_BASE_DEFAULT) - descuento })), kg: totalKg, subtotal, descuento, descLabel })
        setPedidoNumero(result.numero!); setCheckoutStep('done'); setCart([]); setShowCart(false)
        // Item 5 — Limpiar carrito en DB
        import('@/lib/actions/filamentos').then(({ limpiarCarritoUsuario }) => limpiarCarritoUsuario())
      } catch (err) {
        // Network / timeout / server abort: volvemos al form con mensaje claro.
        // El idempotencyKey se mantiene, así que un reintento NO duplica el pedido.
        console.error('handleConfirmarPedido fallo:', err)
        setCheckoutError('Se cortó la conexión. Tocá "Pedir ahora" otra vez — si llegó, no se duplica.')
        setCheckoutStep('form')
      } finally {
        if (submitSlowTimer.current) { clearTimeout(submitSlowTimer.current); submitSlowTimer.current = null }
        setSubmitSlow(false)
      }
    })
  }

  const hasFilters = !!(search || matFilter || marcaFilter || colorFilter)

  // ── Sidebar content ──────────────────────────────────────────────────────
  const filterSidebar = (
    <div className="space-y-5">
      {/* Búsqueda */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por color (ej: azul, negro, dorado)..."
          className="w-full text-base border border-border rounded-xl pl-8 pr-3 py-2.5 bg-background focus:outline-none focus:ring-2 focus:ring-orange-300"
        />
      </div>

      {/* Material */}
      <div role="group" aria-label="Filtrar por material">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">Material</p>
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => setMatFilter('')}
            aria-pressed={!matFilter}
            className={`w-full text-left text-sm px-3 py-2.5 min-h-[44px] rounded-lg transition-colors ${!matFilter ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 font-semibold' : 'hover:bg-secondary'}`}
          >
            Todos ({localFilamentos.length})
          </button>
          {materiales.map(mat => (
            <button
              key={mat}
              type="button"
              onClick={() => setMatFilter(matFilter === mat ? '' : mat)}
              aria-pressed={matFilter === mat}
              className={`w-full text-left text-sm px-3 py-2.5 min-h-[44px] rounded-lg transition-colors flex items-center justify-between ${
                matFilter === mat ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 font-semibold' : 'hover:bg-secondary'
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: MAT_COLORS[mat] ?? '#94a3b8' }} aria-hidden="true" />
                {mat}
              </span>
              <span className="text-xs text-muted-foreground">{localFilamentos.filter(f => f.material === mat).length}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Color */}
      {coloresDisponibles.length > 0 && (
        <div role="group" aria-label="Filtrar por color">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">Color</p>
          <div className="flex flex-wrap gap-2">
            {coloresDisponibles.map(g => {
              const active = colorFilter === g.label
              return (
                <button
                  key={g.label}
                  type="button"
                  onClick={() => setColorFilter(active ? '' : g.label)}
                  title={g.label}
                  aria-pressed={active}
                  className="flex items-center gap-1.5 text-xs px-3 py-2 min-h-[44px] rounded-full border transition-all"
                  style={active
                    ? { backgroundColor: g.css + '33', borderColor: g.css, color: 'var(--foreground)', fontWeight: 600 }
                    : { borderColor: 'var(--border)', color: 'var(--muted-foreground)' }
                  }
                >
                  <span
                    className="w-3 h-3 rounded-full shrink-0 border border-black/10"
                    style={{ backgroundColor: g.css }}
                    aria-hidden="true"
                  />
                  {g.label}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Marca */}
      <div role="group" aria-label="Filtrar por marca">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">Marca</p>
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => setMarcaFilter('')}
            aria-pressed={!marcaFilter}
            className={`w-full text-left text-sm px-3 py-2.5 min-h-[44px] rounded-lg transition-colors ${!marcaFilter ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 font-semibold' : 'hover:bg-secondary'}`}
          >
            Todas
          </button>
          {marcas.map(m => (
            <button
              key={m}
              type="button"
              onClick={() => setMarcaFilter(marcaFilter === m ? '' : m)}
              aria-pressed={marcaFilter === m}
              className={`w-full text-left text-sm px-3 py-2.5 min-h-[44px] rounded-lg transition-colors flex items-center justify-between ${
                marcaFilter === m ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 font-semibold' : 'hover:bg-secondary'
              }`}
            >
              {m}
              <span className="text-xs text-muted-foreground">{localFilamentos.filter(f => f.marca === m).length}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Descuentos */}
      <div>
        <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: '#22c55e' }}>💰 Descuentos por volumen</p>

        {/* Kg acumulados en membresía */}
        {kgAcumulados > 0 && (
          <div className="mb-2 text-[10px] px-2.5 py-1.5 rounded-lg border font-semibold"
            style={{ backgroundColor: 'oklch(0.22 0.04 145)', borderColor: '#166534', color: '#4ade80' }}>
            🏆 {kgAcumulados.toFixed(1)} kg ya comprados este período
            {totalKg > 0 && <span className="text-white/60"> + {totalKg} kg carrito = {kgEfectivo.toFixed(1)} kg</span>}
          </div>
        )}

        <div className="space-y-1.5">
          {[
            { min:  5, desc: 2000, activeStyle: { backgroundColor: '#166534', color: '#bbf7d0', borderColor: '#16a34a' } },
            { min: 10, desc: 3000, activeStyle: { backgroundColor: '#166534', color: '#d4ef8a', borderColor: '#22c55e' } },
            { min: 15, desc: 4000, activeStyle: { backgroundColor: '#166534', color: '#e0f59a', borderColor: '#4ade80' } },
          ].map(t => {
            const activo = kgEfectivo >= t.min
            const faltan = t.min - kgEfectivo
            const proximo = !activo && faltan <= 2 && faltan > 0
            return (
              <div
                key={t.min}
                className="flex items-center justify-between text-xs rounded-lg px-3 py-2 font-semibold transition-all border"
                style={activo
                  ? { ...t.activeStyle, boxShadow: '0 1px 6px #15803d33' }
                  : proximo
                    ? { backgroundColor: 'oklch(0.24 0.06 145)', color: '#4ade80', borderColor: '#166534' }
                    : { backgroundColor: 'oklch(0.22 0.005 264)', color: 'oklch(0.50 0.006 264)', borderColor: 'oklch(1 0 0 / 8%)' }
                }
              >
                <span>{activo ? '✓ ' : proximo ? '⚡ ' : ''}{t.min}+ kg</span>
                <span>−{fmtARS(t.desc)}/kg</span>
              </div>
            )
          })}
        </div>

        {/* Nudge: "te falta X kg para el siguiente tier" */}
        {(() => {
          const tiers = [{ min: 5 }, { min: 10 }, { min: 15 }]
          const siguiente = tiers.find(t => t.min > kgEfectivo)
          if (!siguiente) return null
          const faltan = siguiente.min - kgEfectivo
          if (faltan > 2 || kgEfectivo === 0) return null
          return (
            <p
              className="mt-2 text-[11px] font-bold text-center leading-tight rounded-lg px-2.5 py-2"
              style={{ backgroundColor: 'oklch(0.22 0.05 145)', color: '#4ade80' }}
            >
              ⚡ ¡Agregá {faltan.toFixed(1)} kg más y bajás el precio!
            </p>
          )
        })()}
      </div>

      {/* Ordenar */}
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">Ordenar</p>
        <div className="space-y-1">
          {([
            { value: 'stock',    label: 'Mayor stock' },
            { value: 'az',       label: 'A–Z por color' },
            { value: 'material', label: 'Por material' },
            { value: 'precio',   label: 'Menor precio' },
          ] as { value: SortOption; label: string }[]).map(opt => (
            <button
              key={opt.value}
              onClick={() => setSortBy(opt.value)}
              className={`w-full text-left text-sm px-3 py-1.5 rounded-lg transition-colors ${sortBy === opt.value ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 font-semibold' : 'hover:bg-secondary'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {hasFilters && (
        <button onClick={() => { setSearch(''); setMatFilter(''); setMarcaFilter(''); setColorFilter('') }}
          className="w-full text-xs text-center text-muted-foreground hover:text-foreground underline py-1">
          Limpiar filtros
        </button>
      )}
    </div>
  )

  return (
    <div className="relative">

      {/* ── Layout: sidebar + grid ── */}
      <div className="flex gap-6 items-start">

        {/* Sidebar — visible desde tablet (md:) */}
        <aside className="hidden md:block w-52 shrink-0 sticky top-[72px] bg-card border border-border rounded-2xl p-4">
          {filterSidebar}
        </aside>

        {/* Main */}
        <div className="flex-1 min-w-0">

          {/* Barra top mobile */}
          <div className="flex items-center gap-2 mb-4 md:hidden">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Buscar color..."
                className="w-full text-base border border-border rounded-xl pl-8 pr-3 py-2.5 bg-background focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                hasFilters ? 'bg-orange-50 border-orange-300 text-orange-700 dark:bg-orange-900/20 dark:border-orange-700 dark:text-orange-300' : 'border-border hover:bg-secondary'
              }`}
            >
              <SlidersHorizontal size={14} />
              {hasFilters ? 'Filtros ●' : 'Filtros'}
            </button>
          </div>

          {/* Filtros colapsables mobile */}
          {showFilters && (
            <div className="md:hidden bg-card border border-border rounded-2xl p-4 mb-4">
              {filterSidebar}
            </div>
          )}

          {/* Banner de membresía activa */}
          {kgAcumulados > 0 && (
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl border"
              style={{ backgroundColor: 'oklch(0.22 0.04 145)', borderColor: '#166534', color: '#4ade80' }}>
              <span>🏆</span>
              <span>
                {membresia?.nivel
                  ? `${membresia.nivel} activo`
                  : 'Membresía activa'}
                {' · '}
                {kgAcumulados.toFixed(1)} kg acumulados este período
                {descuento > 0
                  ? <> · <strong style={{ color: '#86efac' }}>−{fmtARS(descuento)}/kg ya aplicado</strong></>
                  : <> · te faltan {(5 - kgAcumulados).toFixed(1)} kg más para el primer descuento</>
                }
              </span>
            </div>
          )}

          {/* Resultado count + sort mobile */}
          <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
            <p className="text-xs sm:text-sm text-muted-foreground shrink-0">
              {filtered.length} disponible{filtered.length !== 1 ? 's' : ''}
            </p>
            {totalKg > 0 && (
              <p className="text-xs font-semibold text-right truncate" style={{ color: '#22c55e' }}>
                {totalKg} kg · {fmtARS(subtotal)}
                {descuento > 0 && <span className="hidden sm:inline"> ({fmtARS(descuento)}/kg off)</span>}
              </p>
            )}
          </div>

          {/* Grid de grupos (marca + material). Dentro del grupo se abre el modal con todos los colores. */}
          {(() => {
            // Un filamento individual es "especial" si su nombre o color menciona fibra de carbono
            const esFibraCarbono = (f: Filamento) => {
              const n = (f.nombre + ' ' + f.color).toLowerCase()
              return n.includes('carbon') || n.includes('fibra')
            }

            // Dividir grupos: si un grupo tiene filamentos especiales Y normales, se parte en dos
            type FilamentoGrupo = typeof grupos.activos[number]
            const normales: FilamentoGrupo[] = []
            const especiales: FilamentoGrupo[] = []

            for (const g of grupos.activos) {
              const fils_especiales = g.filamentos.filter(esFibraCarbono)
              const fils_normales   = g.filamentos.filter(f => !esFibraCarbono(f))

              if (fils_normales.length > 0) {
                normales.push(fils_especiales.length === 0 ? g : { ...g, filamentos: fils_normales })
              }
              if (fils_especiales.length > 0) {
                especiales.push({ ...g, key: g.key + '||cf', filamentos: fils_especiales })
              }
            }

            if (grupos.activos.length === 0 && grupos.agotados.length === 0) {
              return (
                <div className="text-center py-20 text-muted-foreground">
                  <p className="text-4xl mb-3">🔍</p>
                  <p className="font-medium">Sin resultados</p>
                  <button onClick={() => { setSearch(''); setMatFilter(''); setMarcaFilter(''); setColorFilter('') }}
                    className="mt-3 text-sm text-orange-600 underline">Limpiar filtros</button>
                </div>
              )
            }

            return (
              <div className="space-y-6">
                {normales.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {normales.map(g => (
                      <FilamentoGrupoCard key={g.key} grupo={g} cart={cart} onOpen={() => setGrupoAbierto(g)} onAddColor={addToCart} />
                    ))}
                  </div>
                )}

                {especiales.length > 0 && (
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-px flex-1 bg-border" />
                      <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-2 py-1 rounded-full border border-border bg-secondary">
                        ⚡ Materiales técnicos especiales
                      </span>
                      <div className="h-px flex-1 bg-border" />
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                      {especiales.map(g => (
                        <FilamentoGrupoCard key={g.key} grupo={g} cart={cart} onOpen={() => setGrupoAbierto(g)} onAddColor={addToCart} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })()}

          {/* Grupos totalmente sin stock: ocultos de la vista principal.
              Dentro de cada grupo activo, los colores sin stock se siguen viendo
              con tachado en el modal (y mantienen el botón "Avisame"). */}
        </div>
      </div>

      {/* Modal detalle del grupo */}
      {grupoAbierto && (
        <GrupoColoresModal
          grupo={grupoAbierto}
          onClose={() => setGrupoAbierto(null)}
          cart={cart}
          addToCart={addToCart}
          setRollos={setRollos}
          removeFromCart={removeFromCart}
          precioParaFilamento={(f) => (f.precio_kg ?? PRECIO_BASE_DEFAULT) - descuento}
          descuento={descuento}
          misAlertas={misAlertas}
          alertando={alertando}
          handleAvisar={handleAvisar}
          onPayNow={abrirCheckout}
        />
      )}

      {/* ── Sugerencias de filamentos ── */}
      <div className="mt-12 mb-6">
        <div className="rounded-2xl border border-border bg-secondary/30 px-5 py-6 text-center space-y-3 max-w-lg mx-auto">
          <p className="text-2xl">💡</p>
          <p className="font-semibold text-base">¿Te gustaría que traigamos algo especial?</p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Contanos qué filamento te interesaría: marca, material, color, lo que sea. Lo tenemos en cuenta para las próximas compras.
          </p>
          {sugerenciaEnviada ? (
            <p className="text-sm font-semibold text-green-600 dark:text-green-400">✅ ¡Gracias! Tu sugerencia fue enviada.</p>
          ) : (
            <form onSubmit={async (e) => {
              e.preventDefault()
              if (!sugerenciaMensaje.trim()) return
              setSugerenciaEnviando(true)
              await enviarSugerenciaFilamento(sugerenciaMensaje.trim())
              setSugerenciaEnviando(false)
              setSugerenciaEnviada(true)
              setSugerenciaMensaje('')
            }} className="space-y-2">
              <textarea
                value={sugerenciaMensaje}
                onChange={e => setSugerenciaMensaje(e.target.value)}
                placeholder="Ej: Filanova PLA+ en color nude, o PETG transparente..."
                rows={3}
                maxLength={2000}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
              <button type="submit" disabled={sugerenciaEnviando || !sugerenciaMensaje.trim()}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold text-sm py-2.5 rounded-xl transition-colors">
                {sugerenciaEnviando ? 'Enviando...' : 'Enviar sugerencia'}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* ── Botón flotante del carrito ── */}
      {totalKg > 0 && !showCart && !showCheckout && (
        <button
          onClick={abrirCarrito}
          aria-label={`Ver carrito y pagar: ${totalKg} kg, ${fmtARS(subtotal)}`}
          className="fixed right-3 sm:right-4 z-[60] flex items-center gap-2 sm:gap-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 shadow-xl transition-colors max-w-[calc(100vw-24px)] sm:max-w-none focus:outline-none focus:ring-2 focus:ring-orange-300 focus:ring-offset-2"
          style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 72px)' }}
        >
          <ShoppingCart size={16} className="shrink-0" aria-hidden="true" />
          <span className="text-xs sm:text-sm font-bold">Pagar · {totalKg} kg · {fmtARS(subtotal)}</span>
          <span aria-hidden="true" className="text-sm">→</span>
          {descuento > 0 && (
            <span className="hidden xs:inline text-xs bg-white/20 font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap">
              −{fmtARS(descuento)}/kg
            </span>
          )}
        </button>
      )}

      {/* ── Panel del carrito ── */}
      {showCart && (
        <div className="fixed inset-0 z-[70] flex" role="dialog" aria-modal="true" aria-labelledby="cart-drawer-title">
          <div className="flex-1 min-w-0 bg-black/40" onClick={() => setShowCart(false)} aria-hidden="true" />
          <div ref={cartDrawerRef} className="w-full sm:max-w-sm bg-background border-l border-border flex flex-col shadow-2xl" style={{ maxHeight: '100dvh' }}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 id="cart-drawer-title" className="font-bold text-base">Tu carrito</h2>
              <button onClick={() => setShowCart(false)} aria-label="Cerrar carrito" className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-secondary">
                <X size={16} aria-hidden="true" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {cart.map(item => {
                const filActual = localFilamentos.find(f => f.id === item.filamento.id) ?? item.filamento
                const stockDisp = maxKg(filActual)
                const sinStock = stockDisp === 0
                const stockInsuf = !sinStock && item.rollos > stockDisp
                const ultimasUnidades = !sinStock && !stockInsuf && stockDisp <= 3
                return (
                  <div key={item.filamento.id} className={`flex items-center gap-3 transition-opacity ${sinStock ? 'opacity-50' : ''}`}>
                    <span className="w-9 h-9 rounded-xl shrink-0 border border-black/10 shadow-sm"
                      style={{ backgroundColor: colorToCss(item.filamento.color) }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className={`text-sm font-semibold truncate ${sinStock ? 'line-through text-muted-foreground' : ''}`}>{colorEnEs(item.filamento.color)}</p>
                        {ultimasUnidades && (
                          <span
                            className="shrink-0 inline-flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: 'rgba(249,115,22,0.15)', color: '#ea580c', border: '1px solid rgba(249,115,22,0.45)' }}
                          >
                            🔥 Últimas unidades
                          </span>
                        )}
                      </div>
                      {sinStock ? (
                        <p className="text-sm text-red-500 font-semibold">Sin stock — reservado por otro cliente</p>
                      ) : stockInsuf ? (
                        <p className="text-sm text-amber-600 font-semibold">Solo {stockDisp} kg disponibles</p>
                      ) : (
                        <p className="text-xs text-muted-foreground">{item.filamento.marca} · {item.filamento.material}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => setRollos(item.filamento.id, item.rollos - 1)} className="w-11 h-11 flex items-center justify-center rounded-md border border-border hover:bg-secondary" aria-label={`Restar 1 kg de ${colorEnEs(item.filamento.color)}`}><Minus size={16} /></button>
                      <span className="text-sm font-bold w-10 text-center">{item.rollos} kg</span>
                      <button onClick={() => setRollos(item.filamento.id, item.rollos + 1)} disabled={sinStock || item.rollos >= stockDisp} className="w-11 h-11 flex items-center justify-center rounded-md border border-border hover:bg-secondary disabled:opacity-30" aria-label={`Sumar 1 kg de ${colorEnEs(item.filamento.color)}`}><Plus size={16} /></button>
                      <button onClick={() => removeFromCart(item.filamento.id)} className="w-11 h-11 flex items-center justify-center rounded-md hover:bg-red-50 hover:text-red-600 text-muted-foreground ml-2" aria-label={`Quitar ${colorEnEs(item.filamento.color)} del carrito`}><Trash2 size={16} /></button>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="px-5 py-4 border-t border-border space-y-3">
              <div className="space-y-1">
                {kgAcumulados > 0 && (
                  <p className="text-[10px] px-2 pb-1 font-semibold" style={{ color: '#4ade80' }}>
                    🏆 {kgAcumulados.toFixed(1)} kg acumulados + {totalKg} kg carrito = {kgEfectivo.toFixed(1)} kg total
                  </p>
                )}
                {/* Tiers: solo mostramos si el total ya pasó de 3 kg o si ya hay
                    algún descuento activo. Para 1 kg es ruido que le dice al
                    cliente "estás comprando poco". */}
                {(kgEfectivo >= 3 || descuento > 0) && [{ min: 5, desc: 2000 }, { min: 10, desc: 3000 }, { min: 15, desc: 4000 }].map(t => {
                  const activo = kgEfectivo >= t.min
                  const faltan = t.min - kgEfectivo
                  return (
                    <div key={t.min} className={`text-xs flex justify-between items-center px-2.5 py-1.5 rounded-lg ${activo ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300' : 'text-muted-foreground'}`}>
                      <span>{activo ? '✓' : `+${faltan.toFixed(1)} kg`} {t.min}+ kg</span>
                      <span className="font-semibold">-{fmtARS(t.desc)}/kg</span>
                    </div>
                  )
                })}
              </div>
              {(() => {
                // Subtotal es el precio con descuento ya aplicado — para mostrar la
                // resta correcta necesitamos el bruto (precio base × kg).
                const subtotalBruto = cart.reduce((s, i) => s + i.rollos * (i.filamento.precio_kg ?? PRECIO_BASE_DEFAULT), 0)
                const ahorroMembresia = subtotalBruto - subtotal
                return (
                  <div className="space-y-1 pt-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{totalKg} kg · subtotal</span>
                      <span>{fmtARS(subtotalBruto)}</span>
                    </div>
                    {ahorroMembresia > 0 && (
                      <div className="flex justify-between text-xs text-green-600 dark:text-green-400">
                        <span>Ahorro {descLabel} (-{fmtARS(descuento)}/kg)</span>
                        <span className="font-semibold">-{fmtARS(ahorroMembresia)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-base pt-2 border-t border-border">
                      <span>Total</span>
                      <span>{fmtARS(subtotal)}</span>
                    </div>
                  </div>
                )
              })()}
              {(() => {
                const hayProblemas = cart.some(item => {
                  const filActual = localFilamentos.find(f => f.id === item.filamento.id) ?? item.filamento
                  return maxKg(filActual) === 0
                })
                return (
                  <>
                    {hayProblemas && (
                      <p className="text-[11px] text-red-500 text-center">
                        Algunos items no tienen stock disponible. Quitálos del carrito para continuar.
                      </p>
                    )}
                    <div
                      className="flex items-start gap-2 text-[11px] rounded-xl px-3 py-2"
                      style={{ backgroundColor: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: '#15803d' }}
                    >
                      <span aria-hidden="true">🔒</span>
                      <span>
                        <strong>Al confirmar, reservamos tu pedido 24 h.</strong> Avisanos por WhatsApp para coordinar — nadie más puede comprarlo mientras tanto.
                      </span>
                    </div>
                    <button
                      onClick={() => { setShowCart(false); abrirCheckout() }}
                      disabled={hayProblemas}
                      className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:bg-secondary disabled:text-muted-foreground text-white rounded-xl py-3 text-sm font-bold shadow-sm transition-colors disabled:cursor-not-allowed"
                    >
                      Pedir ahora →
                    </button>
                  </>
                )
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal de checkout ── */}
      {showCheckout && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center sm:p-4 bg-black/50" role="dialog" aria-modal="true" aria-labelledby="checkout-title">
          <div ref={checkoutPanelRef} className="relative w-full sm:max-w-md bg-background border border-border sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-y-auto" style={{ maxHeight: '92dvh' }}>
            {/* Drag handle — señala bottom-sheet mobile */}
            <div
              aria-hidden="true"
              className="sticky top-0 flex justify-center pt-2 pb-1 bg-background sm:hidden z-10"
            >
              <span className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>

            {checkoutStep !== 'done' ? (
              <>
                <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                  <h2 id="checkout-title" className="font-bold text-base">Confirmar pedido</h2>
                  {checkoutStep === 'form' && (
                    <button onClick={() => { setShowCheckout(false); setPuntosACanjear(0) }} aria-label="Cerrar checkout" className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-secondary"><X size={16} /></button>
                  )}
                </div>

                {/* Resumen del carrito — total refleja coins canjeados en vivo */}
                <div className="px-6 pt-5 space-y-4">
                  <div className="bg-secondary/40 rounded-xl px-4 py-3 space-y-1">
                    {cart.map(i => (
                      <div key={i.filamento.id} className="flex items-center gap-2 text-sm">
                        <span className="w-3 h-3 rounded-full shrink-0 border border-black/10" style={{ backgroundColor: colorToCss(i.filamento.color) }} />
                        <span className="flex-1 truncate text-xs">{i.rollos} kg {colorEnEs(i.filamento.color)} — {i.filamento.material}</span>
                        <span className="text-xs font-mono text-muted-foreground">{fmtARS(i.rollos * ((i.filamento.precio_kg ?? PRECIO_BASE_DEFAULT) - descuento))}</span>
                      </div>
                    ))}
                    <div className="border-t border-border mt-2 pt-2 space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Subtotal ({totalKg} kg)</span>
                        <span>{fmtARS(subtotal)}</span>
                      </div>
                      {descuento > 0 && (
                        <p className="text-[10px] text-green-600 dark:text-green-400 flex justify-between">
                          <span>Membresía {descLabel}</span>
                          <span>-{fmtARS(descuento)}/kg incluido</span>
                        </p>
                      )}
                      {puntosACanjear > 0 && (
                        <div className="flex justify-between text-xs" style={{ color: '#f59e0b' }}>
                          <span>🪙 DDD Coins</span>
                          <span>-{fmtARS((puntosACanjear / PUNTOS_POR_CANJE) * PESOS_POR_CANJE)}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-baseline text-xl font-black pt-2 border-t border-border/60">
                        <span className="text-sm font-bold text-muted-foreground">Total a pagar</span>
                        <span>{fmtARS(Math.max(0, subtotal - (puntosACanjear / PUNTOS_POR_CANJE) * PESOS_POR_CANJE))}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Confirmación discreta del descuento ya aplicado. El banner
                    "agregá X kg más y desbloqueás −$Y" fue removido del checkout
                    para simplificar: la explicación de membresía vive en /cuenta. */}
                {user && descuento > 0 && (
                  <div className="px-6 pt-0">
                    <div className="flex items-center gap-2 text-xs font-semibold px-3 py-2.5 rounded-xl"
                      style={{ backgroundColor: 'oklch(0.22 0.04 145)', border: '1px solid #166534', color: '#4ade80' }}>
                      <span aria-hidden="true">🏆</span>
                      <span>Descuento de <strong>−{fmtARS(descuento)}/kg</strong> aplicado</span>
                    </div>
                  </div>
                )}

                {/* Form único: guest o logueado. Guest ve una tarjeta de invitación */}
                <div className="px-6 py-5 space-y-4">
                  {user ? (
                    <div className="flex items-center gap-2.5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl px-3.5 py-2.5">
                      {user.user_metadata?.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={user.user_metadata.avatar_url} alt="" className="w-7 h-7 rounded-full shrink-0" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-green-200 dark:bg-green-700 shrink-0 flex items-center justify-center text-xs font-bold text-green-800 dark:text-green-200">
                          {(user.user_metadata?.full_name ?? user.email ?? '?')[0].toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-green-800 dark:text-green-300 truncate">{user.user_metadata?.full_name ?? user.email}</p>
                        <p className="text-[10px] text-green-600 dark:text-green-400 truncate">{user.email}</p>
                      </div>
                    </div>
                  ) : googleDismissed || totalKg < 3 ? (
                    // Colapsado: ya hizo dismiss o es pedido chico (<3 kg).
                    // Un chip diminuto para que la invitación no desaparezca del
                    // todo, pero sin frenar al apurado ni al niño.
                    <button
                      type="button"
                      onClick={() => setGoogleDismissed(false)}
                      className="w-full flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground py-1.5 rounded-lg"
                    >
                      <span aria-hidden="true">🪙</span>
                      <span>¿Entrar con Google? (opcional)</span>
                    </button>
                  ) : (
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3.5 space-y-2.5 relative">
                      <button
                        type="button"
                        onClick={() => {
                          setGoogleDismissed(true)
                          try { localStorage.setItem('ddd_google_dismissed', '1') } catch { /* noop */ }
                        }}
                        aria-label="Ocultar invitación a entrar con Google"
                        className="absolute top-1.5 right-1.5 p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground"
                      >
                        <X size={14} />
                      </button>
                      <div className="flex items-start gap-2 pr-5">
                        <span className="text-xl leading-none">🪙</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-amber-700 dark:text-amber-400">¿Querés ganar puntos y descuentos por cantidad?</p>
                          <p className="text-xs text-muted-foreground leading-snug mt-0.5">
                            Con tu cuenta Google acumulás puntos canjeables (150 pts = $1.000) y accedés al descuento al comprar 5 kg o más por mes.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={loginConCarrito}
                        className="w-full flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-gray-800 border border-gray-300 rounded-lg py-2 text-sm font-semibold shadow-sm transition-colors">
                        <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                        </svg>
                        Entrar con Google (opcional)
                      </button>
                      <p className="text-xs text-muted-foreground text-center leading-snug">
                        O seguí sin cuenta — podés pedir igual completando los datos abajo.
                      </p>
                    </div>
                  )}
                  <div className="space-y-3">
                    <div>
                      <label htmlFor="checkout-nombre" className="text-xs font-semibold text-muted-foreground block mb-1">Tu nombre *</label>
                      <input id="checkout-nombre" type="text" value={clienteNombre} onChange={e => setClienteNombre(e.target.value)}
                        placeholder="¿Cómo te llamás?" disabled={checkoutStep === 'saving'}
                        maxLength={100} required aria-required="true"
                        autoComplete="name" enterKeyHint="next"
                        aria-invalid={!!checkoutError}
                        aria-describedby={checkoutError ? 'checkout-error' : undefined}
                        className="w-full text-base border border-border rounded-lg px-3 py-2.5 bg-background focus:outline-none focus:ring-2 focus:ring-orange-300 disabled:opacity-50" />
                    </div>
                    <div>
                      <label htmlFor="checkout-telefono" className="text-xs font-semibold text-muted-foreground block mb-1">
                        Teléfono {user ? '(opcional)' : '*'}
                      </label>
                      <input id="checkout-telefono" type="tel" value={clienteTelefono} onChange={e => setClienteTelefono(e.target.value)}
                        placeholder="Ej: 3804 55 99 09" disabled={checkoutStep === 'saving'}
                        maxLength={20}
                        required={!user} aria-required={!user}
                        inputMode="tel" autoComplete="tel" enterKeyHint="done"
                        className="w-full text-base border border-border rounded-lg px-3 py-2.5 bg-background focus:outline-none focus:ring-2 focus:ring-orange-300 disabled:opacity-50" />
                      {!user && (
                        <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
                          Puede ser el de un familiar · lo usamos solo para avisarte por WhatsApp.
                        </p>
                      )}
                    </div>
                  </div>
                  {checkoutError && <p id="checkout-error" role="alert" className="text-xs text-red-600 dark:text-red-400">{checkoutError}</p>}
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {user
                      ? 'Queda registrado en tu cuenta. Te contactamos por WhatsApp para confirmar y coordinar (usualmente dentro de 24 h hábiles).'
                      : 'Guardamos tu pedido y te contactamos por WhatsApp para confirmar y coordinar (usualmente dentro de 24 h hábiles).'}
                  </p>
                </div>

                <div className="px-6 pb-5 space-y-2">

                    {/* DDD Coins — colapsado por defecto. El 95% del flujo no
                        usa coins, no debería ocupar espacio salvo que el user
                        lo quiera. Si ya hay canje elegido lo dejamos abierto. */}
                    {user && saldoCoins >= PUNTOS_POR_CANJE && checkoutStep === 'form' && (
                      <details className="rounded-xl border border-border bg-muted/30" open={puntosACanjear > 0}>
                        <summary className="list-none cursor-pointer px-4 py-3 flex items-center justify-between text-sm font-semibold">
                          <span className="flex items-center gap-2">
                            <span aria-hidden="true">🪙</span>
                            Usar mis DDD Coins
                            <span className="text-xs font-normal text-muted-foreground">({saldoCoins} pts)</span>
                          </span>
                          <span className="text-xs text-muted-foreground">{puntosACanjear > 0 ? `-${fmtARS((puntosACanjear / PUNTOS_POR_CANJE) * PESOS_POR_CANJE)}` : 'Ver opciones ▾'}</span>
                        </summary>
                        <div className="px-4 pb-4 pt-1 space-y-2">
                          <div className="flex gap-2 flex-wrap">
                            {[0, PUNTOS_POR_CANJE, PUNTOS_POR_CANJE * 2, PUNTOS_POR_CANJE * 3, PUNTOS_POR_CANJE * 4].filter(n => n === 0 || n <= saldoCoins).map(n => (
                              <button
                                key={n}
                                type="button"
                                onClick={() => setPuntosACanjear(n)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${puntosACanjear === n ? 'text-white border-yellow-500' : 'border-border text-muted-foreground hover:border-yellow-500'}`}
                                style={puntosACanjear === n ? { background: '#d97706' } : {}}
                              >
                                {n === 0 ? 'Sin descuento' : `-$${((n / PUNTOS_POR_CANJE) * PESOS_POR_CANJE).toLocaleString('es-AR')}`}
                              </button>
                            ))}
                          </div>
                          <p className="text-xs text-muted-foreground leading-snug">
                            Ganás puntos en cada pedido · no caducan ·{' '}
                            <Link href="/cuenta?tab=coins" className="underline hover:text-foreground">Ver más →</Link>
                          </p>
                        </div>
                      </details>
                    )}

                    {/* Retiro / Envío / Pago colapsados — para 1-2 kg el
                        cliente no necesita ver todo. Resumen visible, detalles
                        tras el summary. */}
                    <details className="bg-muted/50 rounded-xl text-xs text-muted-foreground mb-1 group">
                      <summary className="list-none cursor-pointer px-3.5 py-3 flex items-center justify-between text-sm font-semibold text-foreground">
                        <span className="flex items-center gap-2">
                          📦 ¿Cómo lo recibo?
                        </span>
                        <span className="text-xs text-muted-foreground group-open:hidden">Ver detalles ▾</span>
                        <span className="text-xs text-muted-foreground hidden group-open:inline">Ocultar ▴</span>
                      </summary>
                      <div className="px-3.5 pb-3.5 space-y-2.5">
                        <div>
                          <p className="font-semibold text-foreground mb-0.5">📍 Retiro en el local</p>
                          <p className="leading-snug">{RETIRO_LOCAL.direccion}</p>
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(RETIRO_LOCAL.mapsQuery)}`}
                            target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline mt-0.5"
                          >
                            🗺️ Cómo llegar (Google Maps)
                          </a>
                          <p className="text-xs leading-snug mt-1">Coordinamos día y hora por WhatsApp.</p>
                        </div>
                        <div className="border-t border-border pt-2">
                          <p className="font-semibold text-foreground mb-0.5">🚚 Entrega</p>
                          <p className="leading-snug">Podés <strong>retirar en el local</strong> o <strong>coordinar la entrega por WhatsApp</strong> (cualquier destino). No ofrecemos envío gratuito; el costo lo cotizamos antes de cerrar el pedido.</p>
                        </div>
                        <div className="border-t border-border pt-2">
                          <p className="font-semibold text-foreground mb-0.5">💳 Pago</p>
                          <p className="leading-snug">Transferencia o efectivo al retirar. El CBU/alias te los pasamos por WhatsApp cuando confirmemos el pedido.</p>
                        </div>
                        <div className="border-t border-border pt-2">
                          <p className="font-semibold text-foreground mb-0.5">⏰ Contacto</p>
                          <p className="leading-snug"><strong>Nosotros te contactamos</strong> por WhatsApp para confirmar y coordinar, usualmente dentro de 24 h hábiles (lun-sáb 9-19). Si nos escribís vos primero, va más rápido.</p>
                        </div>
                      </div>
                    </details>
                    {checkoutStep === 'confirm' ? (
                      <div
                        className="rounded-2xl border p-4 space-y-3"
                        style={{ borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.08)' }}
                      >
                        <div className="text-center space-y-1">
                          <p className="text-sm font-semibold text-muted-foreground">¿Confirmás este pedido?</p>
                          <p className="text-2xl font-black leading-tight">
                            {totalKg} kg · {fmtARS(Math.max(0, subtotal - (puntosACanjear / PUNTOS_POR_CANJE) * PESOS_POR_CANJE))}
                          </p>
                          <p className="text-xs text-muted-foreground">Te contactamos por WhatsApp para coordinar.</p>
                        </div>
                        <div className="grid grid-cols-5 gap-2">
                          <button
                            type="button"
                            onClick={() => setCheckoutStep('form')}
                            className="col-span-2 rounded-xl py-3 text-sm font-bold border border-border hover:bg-secondary"
                          >
                            ← Volver
                          </button>
                          <button
                            type="button"
                            onClick={handleConfirmarPedido}
                            className="col-span-3 rounded-xl py-3 text-base font-black bg-orange-500 hover:bg-orange-600 text-white shadow-sm"
                          >
                            Sí, hacer el pedido
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={handleRevisarPedido}
                        disabled={checkoutStep === 'saving' || isPending || !clienteNombre.trim() || (!user && !clienteTelefono.trim())}
                        className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-40 rounded-xl py-3 text-base font-bold transition-colors">
                        {checkoutStep === 'saving' || isPending ? <><Loader2 size={15} className="animate-spin" /> {submitSlow ? 'Guardando… (la red está lenta)' : 'Guardando pedido…'}</> : 'Pedir ahora →'}
                      </button>
                    )}
                    <p className="text-xs text-muted-foreground text-center">
                      Al confirmar aceptás nuestra{' '}
                      <a href="/privacidad" target="_blank" className="underline hover:text-foreground">política de privacidad</a>
                    </p>
                  </div>
              </>
            ) : (
              <div className="px-6 py-8 text-center space-y-4">
                <div className="flex justify-center"><CheckCircle2 size={52} className="text-green-500" /></div>
                <div>
                  <p className="text-xl font-bold mb-1">¡Pedido N° {pedidoNumero} registrado!</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {user
                      ? 'Tu pedido quedó guardado en tu cuenta. 🎉'
                      : <>Guardá tu <strong>N° de pedido</strong> para consultarlo por WhatsApp. 🎉</>}
                  </p>
                  {!user && pedidoNumero != null && (
                    <button
                      type="button"
                      onClick={() => {
                        try {
                          navigator.clipboard?.writeText(String(pedidoNumero))
                          setAddToast(`✓ N° ${pedidoNumero} copiado`)
                          if (addToastTimerRef.current) clearTimeout(addToastTimerRef.current)
                          addToastTimerRef.current = setTimeout(() => setAddToast(null), 1800)
                        } catch { /* noop */ }
                      }}
                      className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-500 hover:underline"
                    >
                      📋 Copiar N° {pedidoNumero}
                    </button>
                  )}
                  <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                    Ya está reservado 24 h. Te contactamos por WhatsApp para confirmar y coordinar; si nos escribís vos primero, es aún más rápido.
                  </p>
                  {!user && (
                    <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
                      ¿Querés verlo online y repetirlo con un toque?{' '}
                      <button
                        type="button"
                        onClick={loginConCarrito}
                        className="font-semibold text-blue-500 hover:underline"
                      >
                        Crear mi cuenta
                      </button>
                    </p>
                  )}
                </div>
                <button onClick={() => { abrirWhatsApp(pedidoNumero!); setShowCheckout(false) }}
                  className="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1ebe5a] text-white rounded-xl py-3 text-sm font-bold shadow-sm transition-colors">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                    <path d="M11.999 2C6.477 2 2 6.477 2 12c0 1.936.53 3.744 1.452 5.29L2.046 22l4.799-1.396A9.956 9.956 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 11.999 2zm.001 18a7.96 7.96 0 01-4.073-1.117l-.291-.174-3.028.881.86-3.105-.19-.3A7.96 7.96 0 014 12c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8-8 8z" />
                  </svg>
                  Avisar por WhatsApp
                </button>
                <button onClick={() => setShowCheckout(false)} className="w-full text-xs text-muted-foreground hover:text-foreground underline py-1">Cerrar</button>
              </div>
            )}
          </div>
        </div>
      )}

      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} onLogin={loginConCarrito} />}

      {/* Toast: agregado al carrito. Posicionado ARRIBA para no tapar el FAB
          "Pagar ahora" del bottom-right durante los 2s. */}
      {addToast && (
        <div
          role="status" aria-live="polite"
          className="fixed left-1/2 -translate-x-1/2 z-[75] pointer-events-none"
          style={{ top: 'calc(env(safe-area-inset-top, 0px) + 72px)', width: 'min(92vw, 360px)' }}
        >
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-full shadow-xl text-sm font-semibold bg-green-600 text-white">
            <span aria-hidden="true">🛒</span>
            <span className="truncate">{addToast}</span>
          </div>
        </div>
      )}

      {/* Toast: items quitados del carrito por falta de stock */}
      {stockRemovedNames.length > 0 && (
        <div className="fixed bottom-36 left-1/2 -translate-x-1/2 z-50" style={{ width: 'min(92vw, 360px)' }}>
          <div className="flex items-start gap-3 px-4 py-3 rounded-2xl shadow-xl text-sm"
            style={{ backgroundColor: '#1c1208', border: '1px solid #78350f', color: '#fde68a' }}>
            <span className="shrink-0 mt-0.5">⚠️</span>
            <div className="leading-snug">
              <span className="font-bold block">Sin stock disponible</span>
              Se quitaron del carrito: {stockRemovedNames.join(', ')}
            </div>
            <button onClick={() => setStockRemovedNames([])} className="ml-auto shrink-0 opacity-60 hover:opacity-100 text-base">✕</button>
          </div>
        </div>
      )}

      {/* Toast: alerta de stock registrada */}
      <div
        className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 pointer-events-none ${alertToast ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
        style={{ width: 'min(92vw, 360px)' }}
      >
        <div className="flex items-start gap-3 px-4 py-3 rounded-2xl shadow-xl text-sm"
          style={{ backgroundColor: '#1e1b4b', border: '1px solid #4c1d95', color: '#e9d5ff' }}>
          <Bell size={16} className="shrink-0 mt-0.5" style={{ color: '#a78bfa' }} />
          <p className="leading-snug">
            <span className="font-bold block">¡Listo, te anotamos!</span>
            Te avisamos en cuanto vuelva a haber stock. Para recibir la notificación, asegurate de tener tu número de teléfono en{' '}
            <a href="/cuenta" className="underline" style={{ color: '#c4b5fd' }} onClick={() => setAlertToast(false)}>Mi cuenta</a>.
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Botón Pin para el comparador de colores ─────────────────────────────────
function PinComparadorButton({ f, fotoColor }: { f: Filamento; fotoColor: string | null }) {
  const [pinned, setPinned] = useState(false)
  useEffect(() => {
    const read = () => setPinned(isPinnedComparador(f.id))
    read()
    const onChange = () => read()
    window.addEventListener('ddd:comparador-change', onChange)
    return () => window.removeEventListener('ddd:comparador-change', onChange)
  }, [f.id])

  function toggle() {
    if (pinned) {
      unpinComparador(f.id)
      return
    }
    const ok = pinComparador({
      id: f.id,
      color: f.color,
      material: f.material,
      marca: f.marca,
      imagen: fotoColor,
      precio_kg: f.precio_kg ?? PRECIO_BASE_DEFAULT,
      stock_disp_kg: maxKg(f),
    })
    if (!ok) {
      // Ya está lleno (3) o ya pineado; el estado se sincroniza vía event.
    }
  }

  return (
    <button
      onClick={toggle}
      className={`shrink-0 w-9 h-9 rounded-md flex items-center justify-center border transition-colors ${
        pinned
          ? 'bg-orange-500/20 border-orange-500/40 text-orange-500'
          : 'border-border text-muted-foreground hover:bg-secondary'
      }`}
      aria-label={pinned ? `Quitar ${f.color} del comparador` : `Comparar ${f.color}`}
      title={pinned ? 'Quitar del comparador' : 'Comparar (hasta 3)'}
    >
      {pinned ? <PinOff size={13} /> : <Pin size={13} />}
    </button>
  )
}
