import StoreHeader from '@/components/store/StoreHeader'
import StoreFooter from '@/components/store/StoreFooter'
import CartProvider from '@/components/store/CartProvider'

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <StoreHeader />
      <main className="flex-1">{children}</main>
      <StoreFooter />
    </CartProvider>
  )
}
