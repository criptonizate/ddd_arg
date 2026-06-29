'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/server'
import { getAdminUser } from './auth'
import { ManualSaleSchema, StoreCheckoutSchema } from '@/lib/validations/order'
import type { ManualSaleValues, StoreCheckoutValues } from '@/lib/validations/order'
import type { OrderEstado } from '@/lib/supabase/types'
import { findOrCreateCliente } from './clientes'

// ── Admin: cargar venta manual ──────────────────────────────────────────────

export async function createManualSale(data: ManualSaleValues) {
  await getAdminUser()
  const validated = ManualSaleSchema.safeParse(data)
  if (!validated.success) return { error: validated.error.flatten().fieldErrors }

  const supabase = createServiceClient()
  const { items, sena, prioridad, esLocal, ...orderData } = validated.data

  // Pre-validar stock para items con variant_id
  for (const item of items) {
    if (!item.variant_id) continue
    const { data: variant } = await supabase
      .from('product_variants')
      .select('stock, nombre_variante')
      .eq('id', item.variant_id)
      .single()
    if (!variant || variant.stock < item.cantidad) {
      return { error: `Stock insuficiente para "${variant?.nombre_variante ?? item.nombre_producto}" (disponible: ${variant?.stock ?? 0})` }
    }
  }

  const total = items.reduce((sum, i) => sum + i.cantidad * i.precio_unitario, 0)

  // Crear pedido + items en transacción via RPC
  const { data: result, error } = await supabase.rpc('crear_venta_manual', {
    p_order: {
      ...orderData,
      total,
      origen: 'manual',
      estado: esLocal ? 'local' : 'confirmada',
    },
    p_items: items,
  })

  if (error) return { error: error.message }

  // Auto-crear o linkear cliente por nombre
  try {
    const clienteId = await findOrCreateCliente(
      validated.data.cliente_nombre,
      validated.data.cliente_telefono || null
    )
    await supabase.from('orders').update({ cliente_id: clienteId, sena, prioridad }).eq('id', result)
  } catch {
    if (sena > 0 || prioridad) {
      await supabase.from('orders').update({ sena, prioridad }).eq('id', result)
    }
  }

  revalidatePath('/admin/ventas')
  revalidatePath('/admin/dashboard')
  revalidatePath('/admin/clientes')
  return { orderId: result }
}

export async function updateOrderSena(orderId: string, sena: number) {
  await getAdminUser()
  const supabase = createServiceClient()
  const { error } = await supabase.from('orders').update({ sena }).eq('id', orderId)
  if (error) return { error: error.message }
  revalidatePath('/admin/ventas')
  return { success: true }
}

export async function toggleOrderPriority(orderId: string, prioridad: boolean) {
  await getAdminUser()
  const supabase = createServiceClient()
  const { error } = await supabase.from('orders').update({ prioridad }).eq('id', orderId)
  if (error) return { error: error.message }
  revalidatePath('/admin/ventas')
  revalidatePath('/admin/pedidos')
  return { success: true }
}

export async function toggleOrderItemImpreso(itemId: string, impreso: boolean) {
  await getAdminUser()
  const supabase = createServiceClient()
  const { error } = await supabase.from('order_items').update({ impreso }).eq('id', itemId)
  if (error) return { error: error.message }
  revalidatePath('/admin/ventas')
  revalidatePath('/admin/pedidos')
  return { success: true }
}

export async function updateOrderNotaInterna(orderId: string, nota: string | null) {
  await getAdminUser()
  const supabase = createServiceClient()
  const { error } = await supabase.from('orders').update({ nota_interna: nota || null }).eq('id', orderId)
  if (error) return { error: error.message }
  revalidatePath('/admin/pedidos')
  revalidatePath('/admin/ventas')
  return { success: true }
}

export async function updateOrderFechaEntrega(orderId: string, fecha: string | null) {
  await getAdminUser()
  const supabase = createServiceClient()
  const { error } = await supabase.from('orders').update({ fecha_entrega: fecha }).eq('id', orderId)
  if (error) return { error: error.message }
  revalidatePath('/admin/pedidos')
  revalidatePath('/admin/ventas')
  return { success: true }
}

export async function markOrderImprimiendo(orderId: string) {
  await getAdminUser()
  const supabase = createServiceClient()
  const { error } = await supabase.from('orders').update({ estado: 'imprimiendo' }).eq('id', orderId)
  if (error) return { error: error.message }
  revalidatePath('/admin/pedidos')
  revalidatePath('/admin/ventas')
  return { success: true }
}

export async function markOrderListo(orderId: string) {
  await getAdminUser()
  const supabase = createServiceClient()
  const { error } = await supabase.from('orders').update({ estado: 'listo' }).eq('id', orderId)
  if (error) return { error: error.message }
  revalidatePath('/admin/pedidos')
  revalidatePath('/admin/ventas')
  return { success: true }
}

export async function getPastClients(): Promise<{ nombre: string; telefono: string }[]> {
  await getAdminUser()
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('orders')
    .select('cliente_nombre, cliente_telefono')
    .order('created_at', { ascending: false })
    .limit(300)
  const seen = new Set<string>()
  return (data ?? []).filter((o: any) => {
    if (seen.has(o.cliente_nombre)) return false
    seen.add(o.cliente_nombre)
    return true
  }).map((o: any) => ({ nombre: o.cliente_nombre, telefono: o.cliente_telefono ?? '' }))
}

export async function getPendingOrdersCount(): Promise<number> {
  const supabase = createServiceClient()
  const { count } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('estado', 'pendiente')
  return count ?? 0
}

// ── Admin: confirmar pedido pendiente ───────────────────────────────────────

export async function confirmOrder(orderId: string) {
  await getAdminUser()
  const supabase = createServiceClient()

  const { error } = await supabase.rpc('confirmar_pedido', {
    p_order_id: orderId,
  })

  if (error) return { error: error.message }

  revalidatePath('/admin/ventas')
  revalidatePath('/admin/dashboard')
  return { success: true }
}

// ── Admin: cancelar pedido ──────────────────────────────────────────────────

export async function cancelOrder(orderId: string) {
  await getAdminUser()
  const supabase = createServiceClient()

  const { error } = await supabase.rpc('cancelar_pedido', {
    p_order_id: orderId,
  })

  if (error) return { error: error.message }

  revalidatePath('/admin/ventas')
  revalidatePath('/admin/dashboard')
  return { success: true }
}

// ── Admin: cambiar estado manual ────────────────────────────────────────────

export async function updateOrderStatus(orderId: string, estado: OrderEstado) {
  await getAdminUser()
  const supabase = createServiceClient()

  if (estado === 'confirmada') return confirmOrder(orderId)
  if (estado === 'cancelada') return cancelOrder(orderId)

  const { error } = await supabase
    .from('orders')
    .update({ estado })
    .eq('id', orderId)

  if (error) return { error: error.message }

  revalidatePath('/admin/ventas')
  return { success: true }
}

// ── Admin: listado de pedidos ───────────────────────────────────────────────

export async function getOrders(params?: {
  estado?: OrderEstado
  estados?: OrderEstado[]
  limit?: number
  offset?: number
}) {
  const supabase = createServiceClient()
  let query = supabase
    .from('orders')
    .select(`
      *,
      order_items (
        *,
        products (nombre),
        product_variants (nombre_variante, stock)
      )
    `)
    .order('created_at', { ascending: false })

  if (params?.estado) query = query.eq('estado', params.estado)
  if (params?.estados?.length) query = query.in('estado', params.estados)
  if (params?.limit) query = query.limit(params.limit)
  if (params?.offset) query = query.range(params.offset, (params.offset) + (params.limit ?? 20) - 1)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data
}

export async function getOrder(id: string) {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      order_items (
        *,
        products (nombre, categoria),
        product_variants (nombre_variante, color, tamaño)
      )
    `)
    .eq('id', id)
    .single()

  if (error) throw new Error(error.message)
  return data
}

// ── Admin: editar items de un pedido ───────────────────────────────────────

export async function updateOrderItems(
  orderId: string,
  items: { nombre_producto: string; nombre_variante?: string | null; cantidad: number; precio_unitario: number }[]
): Promise<{ error?: string }> {
  await getAdminUser()
  if (!items.length) return { error: 'Debe tener al menos un producto' }
  const supabase = createServiceClient()

  const total = items.reduce((s, i) => s + i.cantidad * i.precio_unitario, 0)

  const { error: deleteError } = await supabase.from('order_items').delete().eq('order_id', orderId)
  if (deleteError) return { error: deleteError.message }

  const { error: insertError } = await supabase.from('order_items').insert(
    items.map((i) => ({
      order_id: orderId,
      nombre_producto: i.nombre_producto,
      nombre_variante: i.nombre_variante || null,
      cantidad: i.cantidad,
      precio_unitario: i.precio_unitario,
    }))
  )
  if (insertError) return { error: insertError.message }

  const { error: updateError } = await supabase.from('orders').update({ total }).eq('id', orderId)
  if (updateError) return { error: updateError.message }

  revalidatePath('/admin/ventas')
  revalidatePath('/admin/pedidos')
  revalidatePath('/admin/clientes')
  return {}
}

// ── Tienda pública: crear pedido WhatsApp ───────────────────────────────────

export async function createStoreOrder(data: StoreCheckoutValues) {
  const validated = StoreCheckoutSchema.safeParse(data)
  if (!validated.success) return { error: validated.error.flatten().fieldErrors }

  const supabase = createServiceClient()
  const { items, ...orderData } = validated.data

  // Verificar stock disponible antes de crear
  for (const item of items) {
    const { data: variant } = await supabase
      .from('product_variants')
      .select('stock, nombre_variante')
      .eq('id', item.variant_id)
      .single()

    if (!variant || variant.stock < item.cantidad) {
      return {
        error: `Stock insuficiente para ${variant?.nombre_variante ?? 'una variante'}`,
      }
    }
  }

  const total = items.reduce((sum, i) => sum + i.cantidad * i.precio_unitario, 0)

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      ...orderData,
      total,
      origen: 'tienda',
      estado: 'pendiente',
      metodo_pago: 'whatsapp',
    })
    .select()
    .single()

  if (orderError || !order) return { error: orderError?.message ?? 'Error al crear el pedido' }

  const orderItems = items.map((i) => ({ ...i, order_id: order.id }))
  const { error: itemsError } = await supabase.from('order_items').insert(orderItems)

  if (itemsError) {
    await supabase.from('orders').delete().eq('id', order.id)
    return { error: itemsError.message }
  }

  // Auto-linkear cliente (best-effort, no falla si la tabla no existe aún)
  try {
    const clienteId = await findOrCreateCliente(
      validated.data.cliente_nombre,
      validated.data.cliente_telefono || null
    )
    await supabase.from('orders').update({ cliente_id: clienteId }).eq('id', order.id)
  } catch { /* migración pendiente */ }

  return { orderId: order.id }
}
