'use client'

import { createContext, useContext, useState, useLayoutEffect, useCallback } from 'react'
import ToastProvider from './ToastProvider'

interface ThemeCtx {
  dark: boolean
  toggle: () => void
}

const ThemeContext = createContext<ThemeCtx>({ dark: true, toggle: () => {} })

export function useTheme() {
  return useContext(ThemeContext)
}

export default function AdminThemeWrapper({ children }: { children: React.ReactNode }) {
  const [dark, setDark] = useState(true)

  useLayoutEffect(() => {
    const stored = localStorage.getItem('admin-theme')
    if (stored === 'light') setDark(false)
  }, [])

  const toggle = useCallback(() => {
    setDark((prev) => {
      const next = !prev
      localStorage.setItem('admin-theme', next ? 'dark' : 'light')
      return next
    })
  }, [])

  return (
    <ThemeContext.Provider value={{ dark, toggle }}>
      <ToastProvider>
        <div
          suppressHydrationWarning
          className={`${dark ? 'dark ' : ''}flex h-screen overflow-hidden bg-background`}
        >
          {children}
        </div>
      </ToastProvider>
    </ThemeContext.Provider>
  )
}
