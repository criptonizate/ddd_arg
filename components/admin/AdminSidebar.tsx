'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { signOut } from '@/lib/actions/auth'
import { cn } from '@/lib/utils'
import { LogOut, Menu, X, Sun, Moon, Zap, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import { useTheme } from './AdminThemeWrapper'
import type { CalculadoraConfig } from '@/lib/actions/calculadora'

function fmtARS(v: number) {
  return v.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

const NAV_ITEMS = [
  { href: '/admin/dashboard', label: '🚀 Dashboard' },
  { href: '/admin/ventas', label: '📦 Pedidos', showBadge: true },
  { href: '/admin/finanzas', label: '💰 Finanzas' },
  { href: '/admin/negocios', label: '🏪 Negocios' },
  { href: '/admin/clientes', label: '👥 Clientes' },
  { href: '/admin/presupuesto', label: '📋 Presupuesto' },
  { href: '/admin/calculadora', label: '🧮 Calculadora' },
  { href: '/admin/productos', label: '🛍️ Productos' },
  { href: '/admin/produccion', label: '🏭 Producción' },
  { href: '/admin/filamentos', label: '🧵 Filamentos' },
  { href: '/admin/gastos', label: '💸 Mis gastos' },
]

export default function AdminSidebar({
  userEmail,
  pendingCount = 0,
  calculadoraConfig,
}: {
  userEmail: string
  pendingCount?: number
  calculadoraConfig?: CalculadoraConfig
}) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const { dark, toggle } = useTheme()
  const [showQuick, setShowQuick] = useState(false)
  const [quickHrs, setQuickHrs] = useState(0)
  const [quickGramos, setQuickGramos] = useState(0)

  function calcQuick(): number {
    if (!calculadoraConfig) return 0
    const { precio_filamento_kg, precio_kwh, consumo_w, vida_util_horas, costo_repuestos, margen_error_pct } = calculadoraConfig
    const material = (quickGramos / 1000) * precio_filamento_kg
    const luz = quickHrs * (consumo_w / 1000) * precio_kwh
    const desgaste = vida_util_horas > 0 ? (quickHrs / vida_util_horas) * costo_repuestos : 0
    const margen = (material + luz + desgaste) * (margen_error_pct / 100)
    return (material + luz + desgaste + margen) * 3
  }

  return (
    <>
      <button
        className="fixed top-4 left-4 z-50 md:hidden p-2 rounded-lg bg-card border border-border shadow-sm"
        onClick={() => setOpen(!open)}
        aria-label="Toggle menu"
        aria-expanded={open}
      >
        {open ? <X size={18} /> : <Menu size={18} />}
      </button>

      {open && (
        <div className="fixed inset-0 z-40 bg-black/20 md:hidden" onClick={() => setOpen(false)} />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex flex-col w-60 bg-card border-r border-border transition-transform duration-200',
          'md:static md:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 p-5 border-b border-border">
          <Image
            src="/LogoDDDARG.png"
            alt="DDD ARG"
            width={511}
            height={339}
            className="h-8 w-auto dark:invert"
          />
          <p className="text-xs text-muted-foreground">Admin</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  'flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  active
                    ? 'bg-foreground text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                )}
              >
                <span>{item.label}</span>
                {item.showBadge && pendingCount > 0 && (
                  <span className={cn(
                    'text-xs font-bold rounded-full px-1.5 py-0.5 min-w-[20px] text-center',
                    active ? 'bg-white/20 text-white' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300'
                  )}>
                    {pendingCount}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Cotización rápida */}
        <div className="border-t border-border p-3">
          <button
            onClick={() => setShowQuick((v) => !v)}
            className="flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <span className="flex items-center gap-2">
              <Zap size={14} />
              Cotización rápida
            </span>
            {showQuick ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>

          {showQuick && (
            <div className="mt-2 px-1 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground block mb-1">Horas</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={quickHrs || ''}
                    onChange={(e) => setQuickHrs(Number(e.target.value))}
                    placeholder="0"
                    className="w-full border border-input rounded-lg px-2 py-1.5 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground block mb-1">Gramos</label>
                  <input
                    type="number"
                    min="0"
                    value={quickGramos || ''}
                    onChange={(e) => setQuickGramos(Number(e.target.value))}
                    placeholder="0"
                    className="w-full border border-input rounded-lg px-2 py-1.5 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
              </div>

              {(quickHrs > 0 || quickGramos > 0) && (
                <div className="rounded-lg px-3 py-2.5" style={{ background: 'rgba(200,0,0,0.10)', border: '1px solid rgba(200,0,0,0.25)' }}>
                  <p className="text-[10px] font-bold text-red-500 uppercase tracking-wide">Total a cobrar</p>
                  <p className="font-bold text-lg leading-tight">$ {fmtARS(calcQuick())}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-border space-y-1">
          {/* Toggle tema */}
          <button
            onClick={toggle}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            {dark ? <Sun size={16} /> : <Moon size={16} />}
            {dark ? 'Modo claro' : 'Modo oscuro'}
          </button>

          <p className="text-xs text-muted-foreground px-3 pt-1 truncate">{userEmail}</p>
          <form action={signOut}>
            <button
              type="submit"
              className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <LogOut size={16} />
              Salir
            </button>
          </form>
        </div>
      </aside>
    </>
  )
}
