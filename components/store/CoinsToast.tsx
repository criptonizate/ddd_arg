'use client'
import { useEffect, useState } from 'react'

export default function CoinsToast({ ganados, racha }: { ganados: number; racha: number }) {
  const [visible, setVisible] = useState(false)
  const [saliendo, setSaliendo] = useState(false)

  useEffect(() => {
    if (ganados <= 0) return
    setVisible(true)
    const t1 = setTimeout(() => setSaliendo(true), 2500)
    const t2 = setTimeout(() => setVisible(false), 3000)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [ganados])

  if (!visible) return null

  const esRacha = racha === 7 || racha === 14 || racha === 30
  const emoji = racha >= 30 ? '🔥🔥🔥' : racha >= 14 ? '🔥🔥' : racha >= 7 ? '🔥' : '🪙'

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))',
        left: '50%',
        transform: `translateX(-50%) translateY(${saliendo ? '20px' : '0px'})`,
        opacity: saliendo ? 0 : 1,
        transition: 'all 0.4s ease',
        zIndex: 9999,
        background: 'oklch(0.20 0.03 60)',
        border: '1px solid #d97706',
        borderRadius: '999px',
        padding: '10px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
        pointerEvents: 'none',
        maxWidth: 'calc(100vw - 32px)',
        width: 'max-content',
      }}
    >
      <span style={{ fontSize: '18px' }}>{emoji}</span>
      <span style={{ color: '#f59e0b', fontWeight: 800, fontSize: '15px' }}>+{ganados} pts</span>
      {esRacha && <span style={{ color: '#d1d5db', fontSize: '12px' }}>· Bonus racha día {racha}</span>}
    </div>
  )
}
