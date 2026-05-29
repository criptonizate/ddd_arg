import CartView from '@/components/store/CartView'

export const metadata = { title: 'Carrito' }

export default function CarritoPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-8">Tu carrito</h1>
      <CartView />
    </div>
  )
}
