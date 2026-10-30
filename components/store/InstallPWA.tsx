'use client'

import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'
import { useCart } from './CartProvider'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISSED_KEY = 'ddd_arg_pwa_dismissed'
const DISMISSED_DAYS = 30

export default function InstallPWA() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [showIOSHint, setShowIOSHint] = useState(false)
  const { filamentCount } = useCart()

  useEffect(() => {
    // Si ya está instalado (display-mode standalone), no mostrar
    if (typeof window === 'undefined') return
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
      // iOS Safari
      (window.navigator as unknown as { standalone?: boolean }).standalone === true
    if (standalone) return

    // Dismissed hace menos de 30 días — más tiempo entre reapariciones
    try {
      const dismissed = localStorage.getItem(DISMISSED_KEY)
      if (dismissed && Date.now() - Number(dismissed) < DISMISSED_DAYS * 86400000) return
    } catch {}

    // Diferimos la aparición 20s para que el usuario entienda la tienda primero
    // y no colisionemos con el flujo inicial de compra.
    const ua = window.navigator.userAgent
    const iOS = /iPad|iPhone|iPod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream
    let iosTimer: ReturnType<typeof setTimeout> | null = null
    if (iOS) {
      setIsIOS(true)
      iosTimer = setTimeout(() => setVisible(true), 20000)
    }

    // Android / Desktop: escuchar evento del navegador (también diferido)
    let desktopTimer: ReturnType<typeof setTimeout> | null = null
    const handler = (e: Event) => {
      e.preventDefault()
      setPrompt(e as BeforeInstallPromptEvent)
      desktopTimer = setTimeout(() => setVisible(true), 20000)
    }
    window.addEventListener('beforeinstallprompt', handler)

    // Si ya se instaló mientras tanto
    const installed = () => setVisible(false)
    window.addEventListener('appinstalled', installed)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      window.removeEventListener('appinstalled', installed)
      if (iosTimer) clearTimeout(iosTimer)
      if (desktopTimer) clearTimeout(desktopTimer)
    }
  }, [])

  async function handleInstall() {
    if (isIOS) { setShowIOSHint(true); return }
    if (!prompt) return
    await prompt.prompt()
    const choice = await prompt.userChoice
    if (choice.outcome === 'accepted') setVisible(false)
    setPrompt(null)
  }

  function handleDismiss() {
    setVisible(false)
    try { localStorage.setItem(DISMISSED_KEY, String(Date.now())) } catch {}
  }

  // No tapar el FAB del carrito cuando hay items — es la conversión principal.
  if (!visible || filamentCount > 0) return null

  return (
    <>
      <div
        style={{
          position: 'fixed',
          bottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9998,
          background: 'oklch(0.20 0.005 264)',
          border: '1px solid #16a34a',
          borderRadius: '16px',
          padding: '12px 14px 12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
          maxWidth: 'calc(100vw - 24px)',
          width: 'max-content',
        }}
      >
        <span style={{ fontSize: '24px' }}>📱</span>
        <div style={{ minWidth: 0 }}>
          <p style={{ color: '#f0fdf4', fontWeight: 700, fontSize: '13px', margin: 0 }}>
            Instalá DDD ARG
          </p>
          <p style={{ color: '#86efac', fontSize: '11px', margin: 0 }}>
            Acceso rápido desde tu pantalla de inicio
          </p>
        </div>
        <button
          onClick={handleInstall}
          style={{
            background: '#16a34a',
            color: '#fff',
            border: 'none',
            borderRadius: '10px',
            padding: '8px 14px',
            fontSize: '12px',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            whiteSpace: 'nowrap',
          }}
        >
          <Download size={14} />
          Instalar
        </button>
        <button
          onClick={handleDismiss}
          aria-label="Cerrar"
          style={{
            background: 'transparent',
            color: '#86efac',
            border: 'none',
            padding: '12px',
            minWidth: 44,
            minHeight: 44,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <X size={16} />
        </button>
      </div>

      {showIOSHint && (
        <div
          onClick={() => setShowIOSHint(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999,
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '16px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'oklch(0.20 0.005 264)', border: '1px solid #16a34a',
              borderRadius: '20px', padding: '24px', maxWidth: '400px', width: '100%',
              color: '#f0fdf4',
            }}
          >
            <p style={{ fontSize: '16px', fontWeight: 800, marginBottom: '12px' }}>
              📱 Instalar en iPhone / iPad
            </p>
            <ol style={{ fontSize: '14px', lineHeight: '1.6', paddingLeft: '18px', margin: 0, color: '#86efac' }}>
              <li>Tocá el botón <strong style={{ color: '#f0fdf4' }}>Compartir</strong> ⎙ en la barra de Safari</li>
              <li>Deslizá y elegí <strong style={{ color: '#f0fdf4' }}>Agregar a inicio</strong> ➕</li>
              <li>Confirmá tocando <strong style={{ color: '#f0fdf4' }}>Agregar</strong></li>
            </ol>
            <button
              onClick={() => setShowIOSHint(false)}
              style={{
                marginTop: '16px', width: '100%', background: '#16a34a', color: '#fff',
                border: 'none', borderRadius: '12px', padding: '12px', fontWeight: 700, cursor: 'pointer',
              }}
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  )
}
