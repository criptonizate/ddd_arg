import { redirect } from 'next/navigation'
import { checkIsAdmin } from '@/lib/actions/auth'
import StoreHeader from '@/components/store/StoreHeader'
import StoreFooter from '@/components/store/StoreFooter'
import CartProvider from '@/components/store/CartProvider'
import InstallPWA from '@/components/store/InstallPWA'

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const isAdmin = await checkIsAdmin()
  if (isAdmin) redirect('/admin/dashboard')

  return (
    <div className="store-dark min-h-screen flex flex-col bg-background text-foreground">
      <CartProvider>
        <StoreHeader />
        <main className="flex-1">{children}</main>
        <StoreFooter />
        <InstallPWA />
      </CartProvider>
    </div>
  )
}
