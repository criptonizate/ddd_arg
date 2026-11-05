'use client'

import Link from 'next/link'
import { useLinkStatus } from 'next/link'
import { Loader2 } from 'lucide-react'

// Link con feedback táctil inmediato: apenas el usuario toca, baja opacity y
// aplica un pequeño scale (-5%). Mientras Next está navegando/cargando, un
// spinner reemplaza el ícono del tab — así no hay sensación de "click muerto"
// que invite a re-tocarlo.
//
// Sub-componente obligatorio: useLinkStatus() SOLO funciona dentro de un
// <Link>. Por eso TabLinkContent va envuelto por <Link> en el export default.
function TabLinkContent({
  children, icon, activeClasses, inactiveClasses,
}: {
  children: React.ReactNode
  icon: React.ReactNode
  activeClasses: string
  inactiveClasses: string
}) {
  const { pending } = useLinkStatus()
  return (
    <span
      className={`shrink-0 flex items-center gap-1.5 px-3 py-3 text-sm font-medium border-b-2 -mb-px min-h-[48px] whitespace-nowrap transition-all active:scale-95 ${pending ? 'opacity-60' : 'opacity-100'} ${activeClasses || inactiveClasses}`}
    >
      {pending ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : icon}
      {children}
    </span>
  )
}

export default function TabLink({
  href, active, activeClasses, inactiveClasses, icon, children, ariaLabel,
}: {
  href: string
  active: boolean
  activeClasses: string
  inactiveClasses: string
  icon: React.ReactNode
  children: React.ReactNode
  ariaLabel?: string
}) {
  return (
    <Link
      href={href}
      prefetch={true}
      aria-current={active ? 'page' : undefined}
      aria-label={ariaLabel}
      className="focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-orange-400 rounded-md"
    >
      <TabLinkContent
        activeClasses={active ? activeClasses : ''}
        inactiveClasses={!active ? inactiveClasses : ''}
        icon={icon}
      >
        {children}
      </TabLinkContent>
    </Link>
  )
}
