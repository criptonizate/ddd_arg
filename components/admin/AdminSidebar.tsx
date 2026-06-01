'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { signOut } from '@/lib/actions/auth'
import { cn } from '@/lib/utils'
import { LogOut, Menu, X } from 'lucide-react'
import { useState } from 'react'

const NAV_ITEMS = [
  { href: '/admin/dashboard', label: '🚀 Dashboard' },
  { href: '/admin/pedidos', label: '📥 Pedidos', showBadge: true },
  { href: '/admin/ventas', label: '💸 Ventas' },
  { href: '/admin/productos', label: '📦 Productos' },
  { href: '/admin/finanzas', label: '💰 Finanzas' },
]

export default function AdminSidebar({
  userEmail,
  pendingCount = 0,
}: {
  userEmail: string
  pendingCount?: number
}) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

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
        <div className="flex items-center gap-3 p-6 border-b border-border">
          <Image src="/logoDDDARG.png" alt="DDD ARG" width={96} height={64} className="h-8 w-auto invert" />
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
                    active ? 'bg-white/20 text-white' : 'bg-yellow-100 text-yellow-700'
                  )}>
                    {pendingCount}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-border">
          <p className="text-xs text-muted-foreground px-3 mb-2 truncate">{userEmail}</p>
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
