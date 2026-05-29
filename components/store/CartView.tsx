'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useCart } from './CartProvider'
import { formatARS, buildWhatsAppMessage } from '@/lib/utils'
import { createStoreOrder } from '@/lib/actions/orders'
import { Trash2, ShoppingBag } from 'lucide-react'
import { useState, useTransition } from 'react'

type EntregaType = 'retiro' | 'envio'

export default function CartView() {
  const { items, removeItem, updateQuantity, clearCart, total } = useCart()
  const [step, setStep] = useState<'cart' | 'checkout' | 'success'>('cart')
  const [form, setForm] = useState({
    nombre: '',
    telefono: '',
    entrega: 'retiro' as EntregaType,
    direccion: '',
    nota: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  if (items.length === 0 && step !== 'success') {
    return (
      <div className="text-center py-16">
        <ShoppingBag size={40} className="text-muted-foreground mx-auto mb-3" />
        <p className="font-medium text-lg">Tu carrito está vacío</p>
        <p className="text-sm text-muted-foreground mt-1 mb-6">
          Explorá el catálogo y agregá productos
        </p>
        <Link
          href="/catalogo"
          className="inline-flex items-center gap-2 bg-foreground text-primary-foreground hover:bg-foreground/90 transition-colors rounded-xl px-6 py-3 text-sm font-medium"
        >
          Ver catálogo
        </Link>
      </div>
    )
  }

  if (step === 'success') {
    return (
      <div className="text-center py-16">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
          <span className="text-3xl">🎉</span>
        </div>
        <h2 className="text-xl font-bold mb-2">¡Pedido enviado!</h2>
        <p className="text-muted-foreground max-w-sm mx-auto mb-6">
          Ya estamos hablando por WhatsApp. Te confirmamos el pedido a la brevedad.
        </p>
        <Link
          href="/catalogo"
          className="inline-flex items-center gap-2 bg-foreground text-primary-foreground hover:bg-foreground/90 transition-colors rounded-xl px-6 py-3 text-sm font-medium"
        >
          Seguir comprando
        </Link>
      </div>
    )
  }

  function handleWhatsAppCheckout() {
    setError(null)
    if (!form.nombre.trim() || !form.telefono.trim()) {
      setError('Completá el nombre y teléfono')
      return
    }
    if (form.entrega === 'envio' && !form.direccion.trim()) {
      setError('Ingresá la dirección de envío')
      return
    }

    startTransition(async () => {
      const res = await createStoreOrder({
        cliente_nombre: form.nombre,
        cliente_telefono: form.telefono,
        cliente_email: '',
        entrega: form.entrega,
        direccion_envio: form.direccion,
        nota: form.nota,
        items: items.map((i) => ({
          product_id: i.product_id,
          variant_id: i.variant_id,
          cantidad: i.cantidad,
          precio_unitario: i.precio,
        })),
      })

      if (res?.error) {
        setError(typeof res.error === 'string' ? res.error : 'Error al procesar el pedido')
        return
      }

      const waNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? ''
      const message = buildWhatsAppMessage({
        items: items.map((i) => ({
          producto: i.nombre,
          variante: i.variante,
          cantidad: i.cantidad,
          precio: i.precio,
        })),
        total,
        cliente: {
          nombre: form.nombre,
          telefono: form.telefono,
          entrega: form.entrega,
          direccion: form.direccion,
          nota: form.nota,
        },
      })

      clearCart()
      setStep('success')
      window.open(`https://wa.me/${waNumber}?text=${message}`, '_blank')
    })
  }

  if (step === 'checkout') {
    return (
      <div className="space-y-6">
        <button onClick={() => setStep('cart')} className="text-sm text-muted-foreground hover:text-foreground">
          ← Volver al carrito
        </button>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Resumen */}
        <div className="bg-secondary/30 rounded-xl p-4 space-y-1.5">
          {items.map((item) => (
            <div key={item.variant_id} className="flex justify-between text-sm">
              <span>
                {item.nombre} — {item.variante} × {item.cantidad}
              </span>
              <span className="font-medium">{formatARS(item.precio * item.cantidad)}</span>
            </div>
          ))}
          <div className="pt-2 border-t border-border flex justify-between font-bold">
            <span>Total</span>
            <span>{formatARS(total)}</span>
          </div>
        </div>

        {/* Formulario */}
        <div className="space-y-4">
          <h2 className="font-semibold">Tus datos</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium mb-1 block">Nombre completo *</label>
              <input
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                placeholder="Juan García"
                className="w-full border border-input rounded-xl px-4 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Teléfono / WhatsApp *</label>
              <input
                value={form.telefono}
                onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                placeholder="11 1234-5678"
                className="w-full border border-input rounded-xl px-4 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium mb-1 block">Forma de entrega *</label>
            <div className="grid grid-cols-2 gap-2">
              {(['retiro', 'envio'] as EntregaType[]).map((op) => (
                <button
                  key={op}
                  type="button"
                  onClick={() => setForm({ ...form, entrega: op })}
                  className={`py-2.5 px-4 rounded-xl text-sm font-medium border transition-colors ${
                    form.entrega === op
                      ? 'bg-foreground text-primary-foreground border-foreground'
                      : 'border-border hover:border-foreground/40'
                  }`}
                >
                  {op === 'retiro' ? '🤝 Retiro en persona' : '📦 Envío'}
                </button>
              ))}
            </div>
          </div>

          {form.entrega === 'envio' && (
            <div>
              <label className="text-xs font-medium mb-1 block">Dirección de envío *</label>
              <input
                value={form.direccion}
                onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                placeholder="Calle Falsa 123, CABA"
                className="w-full border border-input rounded-xl px-4 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          )}

          <div>
            <label className="text-xs font-medium mb-1 block">Nota (opcional)</label>
            <textarea
              value={form.nota}
              onChange={(e) => setForm({ ...form, nota: e.target.value })}
              placeholder="Algún detalle del pedido..."
              rows={2}
              className="w-full border border-input rounded-xl px-4 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>
        </div>

        <button
          onClick={handleWhatsAppCheckout}
          disabled={isPending}
          className="w-full flex items-center justify-center gap-2 bg-green-600 text-white hover:bg-green-700 disabled:opacity-60 transition-colors rounded-xl py-3.5 text-sm font-medium"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          {isPending ? 'Procesando...' : `Enviar pedido por WhatsApp — ${formatARS(total)}`}
        </button>
      </div>
    )
  }

  // Cart view
  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div
          key={item.variant_id}
          className="flex items-center gap-4 bg-card border border-border rounded-xl p-4"
        >
          {item.imagen ? (
            <div className="w-16 h-16 rounded-lg overflow-hidden relative shrink-0">
              <Image src={item.imagen} alt={item.nombre} fill className="object-cover" />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-lg bg-secondary shrink-0 flex items-center justify-center">
              <span className="text-muted-foreground text-xs font-bold">3D</span>
            </div>
          )}

          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">{item.nombre}</p>
            <p className="text-xs text-muted-foreground">{item.variante}</p>
            <p className="text-sm font-semibold mt-0.5">{formatARS(item.precio)}</p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => updateQuantity(item.variant_id, item.cantidad - 1)}
              className="w-7 h-7 rounded-lg border border-border hover:bg-secondary transition-colors flex items-center justify-center"
            >
              −
            </button>
            <span className="w-6 text-center text-sm font-medium">{item.cantidad}</span>
            <button
              onClick={() => updateQuantity(item.variant_id, item.cantidad + 1)}
              disabled={item.cantidad >= item.stock}
              className="w-7 h-7 rounded-lg border border-border hover:bg-secondary disabled:opacity-40 transition-colors flex items-center justify-center"
            >
              +
            </button>
          </div>

          <div className="shrink-0 text-right">
            <p className="font-semibold text-sm">{formatARS(item.precio * item.cantidad)}</p>
            <button
              onClick={() => removeItem(item.variant_id)}
              className="mt-1 p-1 hover:bg-secondary rounded transition-colors"
            >
              <Trash2 size={14} className="text-muted-foreground" />
            </button>
          </div>
        </div>
      ))}

      {/* Subtotal */}
      <div className="flex items-center justify-between py-4 border-t border-border">
        <span className="font-medium">Total</span>
        <span className="text-xl font-bold">{formatARS(total)}</span>
      </div>

      <button
        onClick={() => setStep('checkout')}
        className="w-full flex items-center justify-center gap-2 bg-foreground text-primary-foreground hover:bg-foreground/90 transition-colors rounded-xl py-3.5 text-sm font-medium"
      >
        <ShoppingBag size={16} />
        Finalizar compra
      </button>
    </div>
  )
}
