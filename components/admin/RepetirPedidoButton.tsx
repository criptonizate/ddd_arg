'use client'

import { useRouter } from 'next/navigation'

interface Item {
  nombre_producto: string
  nombre_variante?: string | null
  cantidad: number
  precio_unitario: number
}

interface Props {
  clienteNombre: string
  clienteTelefono?: string | null
  items: Item[]
}

export default function RepetirPedidoButton({ clienteNombre, clienteTelefono, items }: Props) {
  const router = useRouter()

  function handleRepetir() {
    const prefill = {
      cliente_nombre: clienteNombre,
      cliente_telefono: clienteTelefono ?? '',
      items: items
        .filter((i) => i.nombre_producto)
        .map((i) => ({
          nombre: i.nombre_producto,
          variante: i.nombre_variante ?? '',
          cantidad: i.cantidad,
          precio_unitario: i.precio_unitario,
        })),
    }
    try {
      localStorage.setItem('manual_sale_prefill', JSON.stringify(prefill))
    } catch {}
    router.push('/admin/ventas')
  }

  return (
    <button
      onClick={handleRepetir}
      className="text-xs px-2.5 py-1.5 rounded-lg border border-border hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
    >
      Repetir pedido
    </button>
  )
}
