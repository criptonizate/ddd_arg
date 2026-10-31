'use client'

import { useEffect, useRef } from 'react'

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

// Atrapa el foco dentro de `containerRef` mientras `active` es true.
// Al activarse, guarda el elemento focuseado previamente y mueve el foco
// al primer focuseable del container (o al container si no hay). Al
// desactivarse, restaura el foco previo. Entre medio, Tab cicla dentro
// del container (Shift+Tab para atrás).
export function useFocusTrap<T extends HTMLElement>(
  containerRef: React.RefObject<T | null>,
  active: boolean
) {
  const previouslyFocusedRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!active) return
    const container = containerRef.current
    if (!container) return

    previouslyFocusedRef.current = (document.activeElement as HTMLElement) ?? null

    const focusables = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
    const first = focusables[0]
    if (first) first.focus()
    else {
      container.setAttribute('tabindex', '-1')
      container.focus()
    }

    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Tab') return
      const list = container!.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      if (list.length === 0) {
        e.preventDefault()
        return
      }
      const firstEl = list[0]
      const lastEl = list[list.length - 1]
      const activeEl = document.activeElement as HTMLElement | null

      if (e.shiftKey) {
        if (activeEl === firstEl || !container!.contains(activeEl)) {
          e.preventDefault()
          lastEl.focus()
        }
      } else {
        if (activeEl === lastEl || !container!.contains(activeEl)) {
          e.preventDefault()
          firstEl.focus()
        }
      }
    }

    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('keydown', onKey, true)
      // Restaurar foco previo (si todavía existe en el DOM)
      const prev = previouslyFocusedRef.current
      if (prev && document.body.contains(prev)) {
        try { prev.focus() } catch { /* noop */ }
      }
    }
  }, [active, containerRef])
}
