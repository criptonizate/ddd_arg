import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isAnyAdmin, defaultAdminRoute } from '@/lib/admin-roles'
import StoreHeader from '@/components/store/StoreHeader'
import StoreFooter from '@/components/store/StoreFooter'
import CartProvider from '@/components/store/CartProvider'

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (isAnyAdmin(user?.email)) redirect(defaultAdminRoute(user?.email))

  return (
    <div className="store-dark min-h-screen flex flex-col bg-background text-foreground">
      <CartProvider>
        <StoreHeader />
        <main className="flex-1">{children}</main>
        <StoreFooter />
      </CartProvider>
    </div>
  )
}
