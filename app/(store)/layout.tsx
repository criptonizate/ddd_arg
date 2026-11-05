import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isAnyAdmin, defaultAdminRoute } from '@/lib/admin-roles'
import StoreHeader from '@/components/store/StoreHeader'
import StoreFooter from '@/components/store/StoreFooter'
import CartProvider from '@/components/store/CartProvider'
import ColorComparador from '@/components/store/ColorComparador'
import WelcomeTrialModal from '@/components/store/WelcomeTrialModal'
import { getMembresiaCliente } from '@/lib/actions/filamento-pedidos'

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (isAnyAdmin(user?.email)) redirect(defaultAdminRoute(user?.email))

  // Si está logueado y en trial activo, el modal de bienvenida se muestra una
  // sola vez (flag en localStorage). Guest / expirado → no se muestra.
  let trialActivo = false
  let trialDias = 0
  if (user) {
    try {
      const mem = await getMembresiaCliente(user.id)
      if (mem?.esTrial && mem.diasRestantes > 0) {
        trialActivo = true
        trialDias = mem.diasRestantes
      }
    } catch { /* membresia no crítica para mostrar la tienda */ }
  }

  return (
    <div className="store-dark min-h-screen flex flex-col bg-background text-foreground overflow-x-hidden">
      <CartProvider>
        <StoreHeader />
        <main className="flex-1">{children}</main>
        <StoreFooter />
        <ColorComparador />
        <WelcomeTrialModal active={trialActivo} diasRestantes={trialDias} />
      </CartProvider>
    </div>
  )
}
