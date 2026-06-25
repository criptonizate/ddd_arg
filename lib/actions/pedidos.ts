'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/server'
import { getAdminUser } from './auth'
import { z } from 'zod'

const PedidoItemSchema = z.object({
  product_id: z.string().uuid().optional(),
  nombre_producto: z.string().min(1),
  observacion: z.string().optional().default(''),
  cantidad: z.number().int().min(1),
  precio_unitario: z.number().min(0),
})

const CreatePedidoSchema = z.object({
  cliente_nombre: z.string().min(2, 'Ingresá el nombre').trim(),
  cliente_telefono: z.string().optional().default(''),
  origen: z.enum(['whatsapp', 'instagram', 'manual']),
  nota: z.string().optional().default(''),
  entrega: z.enum(['retiro', 'envio']),
  direccion_envio: z.string().optional().default(''),
  sena: z.number().min(0).default(0),
  prioridad: z.boolean().default(false),
  fecha_entrega: z.string().optional().nullable(),
  items: z.array(PedidoItemSchema).min(1, 'Agregá al menos un producto'),
})

export type CreatePedidoValues = z.infer<typeof CreatePedidoSchema>

export async function createPedido(data: CreatePedidoValues) {
  await getAdminUser()
  const validated = CreatePedidoSchema.safeParse(data)
  if (!validated.success) return { error: validated.error.flatten().fieldErrors }

  const supabase = createServiceClient()
  const { items, sena, prioridad, fecha_entrega, ...orderData } = validated.data

  const total = items.reduce((sum, i) => sum + i.cantidad * i.precio_unitario, 0)

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      cliente_nombre: orderData.cliente_nombre,
      cliente_telefono: orderData.cliente_telefono || null,
      origen: orderData.origen,
      nota: orderData.nota || null,
      entrega: orderData.entrega,
      direccion_envio: orderData.direccion_envio || null,
      total,
      sena,
      prioridad,
      fecha_entrega: fecha_entrega || null,
      estado: 'pendiente',
      metodo_pago: null,
    })
    .select()
    .single()

  if (orderError || !order) return { error: orderError?.message ?? 'Error al crear el pedido' }

  const orderItems = items.map((i) => ({
    order_id: order.id,
    product_id: i.product_id ?? null,
    variant_id: null,
    nombre_producto: i.nombre_producto,
    nombre_variante: i.observacion || null,
    cantidad: i.cantidad,
    precio_unitario: i.precio_unitario,
  }))

  const { error: itemsError } = await supabase.from('order_items').insert(orderItems)
  if (itemsError) {
    await supabase.from('orders').delete().eq('id', order.id)
    return { error: itemsError.message }
  }

  // Auto-linkear cliente (best-effort)
  try {
    const { findOrCreateCliente } = await import('./clientes')
    const clienteId = await findOrCreateCliente(
      validated.data.cliente_nombre,
      validated.data.cliente_telefono || null
    )
    await supabase.from('orders').update({ cliente_id: clienteId }).eq('id', order.id)
  } catch { /* migración pendiente */ }

  revalidatePath('/admin/pedidos')
  revalidatePath('/admin/clientes')
  return { orderId: order.id }
}
