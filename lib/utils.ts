import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { OrderEstado, ProductEstado, EgresoCategoria } from './supabase/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Formatea moneda en ARS
export function formatARS(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

// Formatea fecha en es-AR
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date))
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export const ESTADO_LABELS: Record<OrderEstado, string> = {
  pendiente: 'Pendiente',
  confirmada: 'Confirmada',
  listo: 'Listo para retirar',
  entregada: 'Entregada',
  cancelada: 'Cancelada',
}

export const ESTADO_COLORS: Record<OrderEstado, string> = {
  pendiente: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  confirmada: 'bg-blue-100 text-blue-800 border-blue-200',
  listo: 'bg-purple-100 text-purple-800 border-purple-200',
  entregada: 'bg-green-100 text-green-800 border-green-200',
  cancelada: 'bg-red-100 text-red-800 border-red-200',
}

export const METODO_PAGO_LABELS: Record<string, string> = {
  efectivo: '💵 Efectivo',
  transferencia: '🏦 Transferencia',
  mercadopago: '💙 Mercado Pago',
  whatsapp: '💬 WhatsApp',
}

export const ORIGEN_LABELS: Record<string, string> = {
  tienda: '🌐 Web',
  manual: '✏️ Manual',
  whatsapp: '💬 WhatsApp',
  instagram: '📸 Instagram',
}

export const PRODUCT_ESTADO_LABELS: Record<ProductEstado, string> = {
  activo: 'Activo',
  pausado: 'Pausado',
  agotado: 'Agotado',
  archivado: 'Archivado',
}

export const EGRESO_CATEGORIA_LABELS: Record<EgresoCategoria, string> = {
  filamento_insumos: 'Filamento / Insumos',
  electricidad: 'Electricidad',
  repuestos_impresora: 'Repuestos Impresora',
  envios: 'Envíos',
  comisiones: 'Comisiones',
  otros: 'Otros',
}

// Genera mensaje de WhatsApp con el pedido
export function buildWhatsAppMessage(params: {
  items: { producto: string; variante: string; cantidad: number; precio: number }[]
  total: number
  cliente: {
    nombre: string
    telefono: string
    entrega: string
    direccion?: string
    nota?: string
  }
}): string {
  const { items, total, cliente } = params

  const itemsText = items
    .map(
      (i) =>
        `• ${i.producto} (${i.variante}) x${i.cantidad} — ${formatARS(i.precio * i.cantidad)}`
    )
    .join('\n')

  const entregaText =
    cliente.entrega === 'retiro'
      ? 'Retiro en persona'
      : `Envío a: ${cliente.direccion}`

  const notaText = cliente.nota ? `\n📝 Nota: ${cliente.nota}` : ''

  return encodeURIComponent(
    `🛒 *Nuevo Pedido DDD ARG*\n\n` +
      `👤 *Cliente:* ${cliente.nombre}\n` +
      `📱 *Teléfono:* ${cliente.telefono}\n` +
      `🚚 *Entrega:* ${entregaText}${notaText}\n\n` +
      `*Productos:*\n${itemsText}\n\n` +
      `*Total: ${formatARS(total)}*`
  )
}
