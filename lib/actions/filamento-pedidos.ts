'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/server'
import { getAdminUser } from './auth'
import { sendNuevoPedidoAdmin, sendPedidoRecibidoCliente, sendPedidoConfirmadoCliente, sendExtensionSolicitadaAdmin } from '@/lib/email'

export interface FilamentoPedidoItem {
  filamento_id: string
  nombre: string
  color: string
  material: string
  marca: string
  rollos: number
  precio_unitario: number
}

export interface FilamentoPedido {
  id: string
  numero: number
  user_id: string | null
  numero_cliente: number | null
  estado: 'pendiente' | 'confirmado' | 'cancelado' | 'entregado'
  cliente_nombre: string
  cliente_telefono: string | null
  items: FilamentoPedidoItem[]
  total_rollos: number
  descuento_por_rollo: number
  descuento_coins: number
  total: number
  nota: string | null
  reservado_hasta: string | null
  created_at: string
  updated_at: string
}

// ── Público: crear pedido (requiere login) ─────────────────────────────────

export async function crearPedidoFilamento(data: {
  cliente_nombre: string
  cliente_telefono?: string
  items: FilamentoPedidoItem[]
  puntosACanjear?: number
}): Promise<{ numero?: number; id?: string; error?: string }> {
  if (!data.cliente_nombre.trim()) return { error: 'El nombre es requerido' }
  if (data.cliente_nombre.trim().length > 100) return { error: 'El nombre es demasiado largo' }
  if (data.cliente_telefono && data.cliente_telefono.trim().length > 20) return { error: 'El teléfono es demasiado largo' }
  if (!data.items.length) return { error: 'El carrito está vacío' }
  if (data.items.length > 20) return { error: 'El pedido no puede tener más de 20 items' }
  for (const item of data.items) {
    if (!Number.isInteger(item.rollos) || item.rollos <= 0 || item.rollos > 50) {
      return { error: `Cantidad inválida para ${item.nombre}: debe ser entre 1 y 50 kg` }
    }
  }

  // Login obligatorio para hacer un pedido
  const { createClient } = await import('@/lib/supabase/server')
  const supabaseAuth = await createClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return { error: 'Necesitás iniciar sesión para hacer un pedido' }

  const supabase = createServiceClient()

  // Calcular descuento server-side según membresía real del usuario
  const membresia = await getMembresiaCliente(user.id).catch(() => null)
  const descuento_por_rollo = membresia?.descuento ?? 0

  // Buscar precios reales de cada filamento en DB (no confiar en los del cliente)
  const filamentoIds = [...new Set(data.items.map(i => i.filamento_id))]
  const { data: filamentosDB } = await supabase
    .from('filamentos')
    .select('id, precio_kg')
    .in('id', filamentoIds)
  const precioMap: Record<string, number> = {}
  for (const f of (filamentosDB ?? [])) precioMap[f.id] = f.precio_kg ?? 0

  // Reconstruir items con precios reales — excluir items con filamento_id desconocido
  const itemsValidados: FilamentoPedidoItem[] = data.items
    .filter(item => precioMap[item.filamento_id] !== undefined)
    .map(item => ({
      ...item,
      precio_unitario: precioMap[item.filamento_id],
    }))
  if (!itemsValidados.length) return { error: 'Ningún filamento del pedido es válido' }
  const total_rollos = itemsValidados.reduce((s, i) => s + i.rollos, 0)

  // Descuento DDD Coins
  let descuento_coins = 0
  if (data.puntosACanjear && data.puntosACanjear > 0) {
    const { calcularDescuentoCoins } = await import('../ddd-coins-helpers')
    const { getSaldoCoins } = await import('./ddd-coins')
    const saldo = await getSaldoCoins(user.id)
    if (saldo >= data.puntosACanjear) {
      descuento_coins = calcularDescuentoCoins(data.puntosACanjear)
    }
  }

  const total = Math.max(0, itemsValidados.reduce((s, i) => s + i.rollos * (i.precio_unitario - descuento_por_rollo), 0) - descuento_coins)

  const reservadoHasta = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString()

  const { data: row, error } = await supabase
    .from('filamento_pedidos')
    .insert({
      cliente_nombre: data.cliente_nombre.trim(),
      cliente_telefono: data.cliente_telefono?.trim() || null,
      items: itemsValidados,
      total_rollos,
      descuento_por_rollo,
      descuento_coins,
      total,
      estado: 'pendiente',
      reservado_hasta: reservadoHasta,
      user_id: user.id,
    })
    .select('id, numero')
    .single()

  if (error) return { error: error.message }

  // Reservar stock por 3h para cada item
  if (itemsValidados.length > 0) {
    await supabase
      .from('filamento_reservas')
      .insert(itemsValidados.map(item => ({
        pedido_id: row.id,
        filamento_id: item.filamento_id,
        gramos: Math.round(item.rollos * 1000),
        reservado_hasta: reservadoHasta,
      })))
  }

  revalidatePath('/admin/filamentos')
  revalidatePath('/cuenta')

  // Sumar puntos por compra y canjear coins si corresponde (awaited para consistencia)
  const { sumarPuntosPorCompra, canjearCoinsEnPedido } = await import('./ddd-coins')
  await Promise.allSettled([
    sumarPuntosPorCompra(user.id, total_rollos, row.id),
    data.puntosACanjear && data.puntosACanjear > 0 && descuento_coins > 0
      ? canjearCoinsEnPedido(user.id, data.puntosACanjear, row.id)
      : Promise.resolve(),
  ])

  // Emails — fire and forget, no bloqueamos la respuesta
  const emailData = {
    numero: row.numero,
    clienteNombre: data.cliente_nombre,
    clienteEmail: user.email,
    items: itemsValidados,
    totalRollos: total_rollos,
    descuentoPorRollo: descuento_por_rollo,
    total,
  }
  void sendNuevoPedidoAdmin(emailData)
  if (user.email) {
    void sendPedidoRecibidoCliente({ ...emailData, clienteEmail: user.email })
  }

  return { numero: row.numero, id: row.id }
}

// ── Admin: listar pedidos ──────────────────────────────────────────────────

export async function getFilamentoPedidos(estado?: string): Promise<FilamentoPedido[]> {
  await getAdminUser()
  const supabase = createServiceClient()
  let q = supabase
    .from('filamento_pedidos')
    .select('*')
    .order('created_at', { ascending: false })
  if (estado) q = q.eq('estado', estado)
  const { data } = await q
  const pedidos = (data ?? []) as FilamentoPedido[]

  // Enrich with numero_cliente from user_profiles
  const userIds = [...new Set(pedidos.filter(p => p.user_id).map(p => p.user_id!))]
  if (userIds.length) {
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('user_id, numero_cliente')
      .in('user_id', userIds)
    const map: Record<string, number> = {}
    for (const p of profiles ?? []) map[p.user_id] = p.numero_cliente
    for (const p of pedidos) {
      p.numero_cliente = p.user_id ? (map[p.user_id] ?? null) : null
    }
  }
  return pedidos
}

export async function getPedidosByUser(userId: string): Promise<FilamentoPedido[]> {
  await getAdminUser()
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('filamento_pedidos')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  return (data ?? []) as FilamentoPedido[]
}

export async function updateEstadoPedidoFilamento(
  id: string,
  estado: 'confirmado' | 'cancelado' | 'entregado',
  nota?: string,
): Promise<{ error?: string }> {
  await getAdminUser()
  if (nota && nota.length > 500) return { error: 'La nota no puede superar los 500 caracteres' }
  const supabase = createServiceClient()
  const { error } = await supabase
    .from('filamento_pedidos')
    .update({ estado, ...(nota !== undefined ? { nota } : {}), updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return { error: error.message }
  // Al cancelar, liberar la reserva de stock
  if (estado === 'cancelado') {
    await supabase.from('filamento_reservas').delete().eq('pedido_id', id)
  }
  revalidatePath('/admin/filamentos')
  return {}
}

// Confirma el pedido y descuenta el stock de cada item
export async function confirmarPedidoYDescontarStock(
  pedidoId: string,
  nota?: string,
): Promise<{ error?: string }> {
  await getAdminUser()
  const supabase = createServiceClient()

  // Obtener pedido
  const { data: pedido, error: fetchErr } = await supabase
    .from('filamento_pedidos')
    .select('*')
    .eq('id', pedidoId)
    .single()

  if (fetchErr || !pedido) return { error: 'Pedido no encontrado' }
  if (pedido.estado !== 'pendiente') return { error: `El pedido ya está ${pedido.estado}` }

  const items = pedido.items as FilamentoPedidoItem[]
  const fecha = new Date().toISOString().split('T')[0]
  const errors: string[] = []

  for (const item of items) {
    const gramos = Math.round(item.rollos * 1000) // rollos = kg

    // Descontar stock de forma atómica via RPC (evita race conditions)
    const { data: rpcResult, error: rpcError } = await supabase
      .rpc('descontar_stock_filamento', {
        p_filamento_id: item.filamento_id,
        p_gramos: gramos,
        p_rollos: item.rollos,
      })

    if (rpcError || !(rpcResult as { ok: boolean })?.ok) {
      const msg = (rpcResult as { error?: string })?.error ?? rpcError?.message ?? 'Error descontando stock'
      errors.push(`${item.color}: ${msg}`)
      continue
    }

    // Obtener costo_kg para el registro de venta
    const { data: fil } = await supabase
      .from('filamentos')
      .select('costo_kg')
      .eq('id', item.filamento_id)
      .single()

    // Registrar en historial de ventas
    await supabase
      .from('filamento_ventas')
      .insert({
        filamento_id: item.filamento_id,
        gramos,
        precio_kg: item.precio_unitario,
        costo_kg: fil.costo_kg || 0,
        cliente: pedido.cliente_nombre,
        nota: `Pedido web N°${pedido.numero}`,
        fecha,
        user_id: pedido.user_id ?? null,
        pedido_id: pedidoId,
      })
  }

  if (errors.length === items.length) {
    return { error: errors.join('; ') }
  }

  const notaFinal = [nota, errors.length ? `Advertencias: ${errors.join('; ')}` : ''].filter(Boolean).join(' — ')

  const { error: updErr } = await supabase
    .from('filamento_pedidos')
    .update({
      estado: 'confirmado',
      ...(notaFinal ? { nota: notaFinal } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('id', pedidoId)

  if (updErr) return { error: updErr.message }

  // Liberar reserva de stock (ya fue descontado del stock real)
  await supabase.from('filamento_reservas').delete().eq('pedido_id', pedidoId)

  revalidatePath('/admin/filamentos')
  revalidatePath('/filamentos')

  // Email de confirmación al cliente
  if (pedido.user_id) {
    const supabaseAuth = createServiceClient()
    const { data: { user } } = await supabaseAuth.auth.admin.getUserById(pedido.user_id)
    if (user?.email) {
      void sendPedidoConfirmadoCliente({
        numero: pedido.numero,
        clienteNombre: pedido.cliente_nombre,
        clienteEmail: user.email,
        items: pedido.items as FilamentoPedidoItem[],
        totalRollos: pedido.total_rollos,
        descuentoPorRollo: pedido.descuento_por_rollo,
        total: pedido.total,
      })
    }
  }

  return {}
}

export async function editarItemsPedidoFilamento(
  pedidoId: string,
  items: FilamentoPedidoItem[]
): Promise<{ error?: string }> {
  await getAdminUser()
  if (!items.length) return { error: 'El pedido debe tener al menos un ítem' }
  for (const item of items) {
    if (!Number.isInteger(item.rollos) || item.rollos < 1 || item.rollos > 50) {
      return { error: 'Cantidad de rollos inválida (1-50)' }
    }
  }

  const total_rollos = items.reduce((s, i) => s + i.rollos, 0)

  const supabase = createServiceClient()

  // Obtener user_id del pedido para recalcular descuento según membresía real
  const { data: pedidoRow } = await supabase
    .from('filamento_pedidos')
    .select('user_id')
    .eq('id', pedidoId)
    .single()
  const membresia = pedidoRow?.user_id
    ? await getMembresiaCliente(pedidoRow.user_id).catch(() => null)
    : null
  const descuento_por_rollo = membresia?.descuento ?? 0

  const total = items.reduce((s, i) => s + i.rollos * (i.precio_unitario - descuento_por_rollo), 0)
  const { error } = await supabase
    .from('filamento_pedidos')
    .update({ items, total_rollos, descuento_por_rollo, total, updated_at: new Date().toISOString() })
    .eq('id', pedidoId)

  if (error) return { error: error.message }
  revalidatePath('/admin/filamentos')
  return {}
}

import { TIERS_MEMBRESIA, calcularPeriodo, costoExtension, DIAS_EXTENSION, type EventoCompra, type NivelMembresia, type MembresiaStatus } from '@/lib/membresia-helpers'
export type { NivelMembresia, MembresiaStatus } from '@/lib/membresia-helpers'

// Público — sin auth de admin, llamado desde la página de cuenta del cliente
export async function getMembresiaCliente(userId: string): Promise<MembresiaStatus | null> {
  const supabase = createServiceClient()

  const [{ data: pedidos, error: e1 }, { data: ventas, error: e2 }, { data: extensiones, error: e3 }, { data: trial, error: e4 }] = await Promise.all([
    supabase
      .from('filamento_pedidos')
      .select('updated_at, total_rollos')
      .eq('user_id', userId)
      .in('estado', ['confirmado', 'entregado']),
    supabase
      .from('filamento_ventas')
      .select('fecha, gramos')
      .eq('user_id', userId),
    supabase
      .from('membresia_extensiones')
      .select('dias, estado')
      .eq('user_id', userId),
    supabase
      .from('membresia_trial')
      .select('trial_fin')
      .eq('user_id', userId)
      .maybeSingle(),
  ])

  if (e1 || e2 || e3 || e4) {
    console.error('getMembresiaCliente errors:', { e1, e2, e3, e4 })
  }

  const eventosPedidos: EventoCompra[] = (pedidos ?? []).map((p: { updated_at: string; total_rollos: number }) => ({
    fecha_iso: p.updated_at,
    kg: p.total_rollos ?? 0,
  }))

  const eventosVentas: EventoCompra[] = (ventas ?? []).map((v: { fecha: string; gramos: number }) => ({
    fecha_iso: v.fecha.includes('T') ? v.fecha : `${v.fecha}T12:00:00Z`,
    kg: v.gramos / 1000,
  }))

  const todos: EventoCompra[] = [...eventosPedidos, ...eventosVentas]
    .filter(e => e.kg > 0)
    .sort((a, b) => new Date(a.fecha_iso).getTime() - new Date(b.fecha_iso).getTime())

  const nowMs = Date.now()

  // Si no tiene compras, verificar si tiene trial activo
  if (!todos.length) {
    if (trial?.trial_fin && new Date(trial.trial_fin).getTime() > nowMs) {
      const trialFin = new Date(trial.trial_fin)
      const diasRestantes = Math.max(0, Math.ceil((trialFin.getTime() - nowMs) / (24 * 60 * 60 * 1000)))
      const mayoristaTier = TIERS_MEMBRESIA.find(t => t.label === 'Plata')!
      return {
        kgPeriodo: 0,
        periodoInicio: new Date(trial.trial_fin as string).toISOString(), // se reemplaza al primer pedido
        periodoFin: trialFin.toISOString(),
        diasRestantes,
        nivel: 'Plata',
        descuento: mayoristaTier.descuento,
        totalHistorico: 0,
        extensionPendiente: false,
        esTrial: true,
      }
    }
    return null
  }

  const extensionConfirmadaDias = (extensiones ?? [])
    .filter((e: { dias: number; estado: string }) => e.estado === 'confirmado')
    .reduce((s: number, e: { dias: number; estado: string }) => s + e.dias, 0)

  const extensionPendienteDias = (extensiones ?? [])
    .filter((e: { dias: number; estado: string }) => e.estado === 'pendiente')
    .reduce((s: number, e: { dias: number; estado: string }) => s + e.dias, 0)

  const extensionPendiente = extensionPendienteDias > 0

  const totalHistorico = todos.reduce((s, e) => s + e.kg, 0)

  // Días confirmados ya aplicados permanentemente.
  // Días pendientes se suman provisionalmente para mantener la membresía activa
  // mientras el admin no confirme ni rechace. Si admin rechaza, se eliminan.
  const extensionDias = extensionConfirmadaDias + extensionPendienteDias
  const { periodoInicio, periodoFin, kgPeriodo } = calcularPeriodo(todos, extensionDias)

  const activo = periodoFin.getTime() > nowMs
  const diasRestantes = activo ? Math.max(0, Math.ceil((periodoFin.getTime() - nowMs) / (24 * 60 * 60 * 1000))) : 0

  const tierActivo = activo ? TIERS_MEMBRESIA.find(t => kgPeriodo >= t.min) : undefined
  const nivel: NivelMembresia = tierActivo?.label ?? null

  return {
    kgPeriodo: activo ? kgPeriodo : 0,
    periodoInicio: periodoInicio.toISOString(),
    periodoFin: periodoFin.toISOString(),
    diasRestantes,
    nivel,
    descuento: tierActivo?.descuento ?? 0,
    totalHistorico,
    extensionPendiente,
    esTrial: false,
  }
}

// Cliente solicita extensión — registra como pendiente y redirige a WhatsApp
export async function solicitarExtensionMembresia(): Promise<void> {
  const { createClient } = await import('@/lib/supabase/server')
  const { redirect } = await import('next/navigation')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/cuenta?tab=membresia')
  const userId = user!.id

  const sb = createServiceClient()

  // Verificar que no haya ya una pendiente
  const { data: existente } = await sb
    .from('membresia_extensiones')
    .select('id')
    .eq('user_id', userId)
    .eq('estado', 'pendiente')
    .maybeSingle()

  if (!existente) {
    // Calcular costo según nivel actual y registrar solicitud
    const membresiaActual = await getMembresiaCliente(userId)
    const costo = costoExtension(membresiaActual?.nivel ?? null)
    const nivel = membresiaActual?.nivel ?? 'Plata'
    await sb.from('membresia_extensiones').insert({ user_id: userId, dias: DIAS_EXTENSION, costo })

    // Obtener datos del usuario para el email
    const { data: authUser } = await sb.auth.admin.getUserById(userId)
    const { data: perfil } = await sb.from('user_profiles').select('numero_cliente').eq('user_id', userId).maybeSingle()
    const clienteNombre = authUser?.user?.user_metadata?.full_name ?? authUser?.user?.email?.split('@')[0] ?? 'Cliente'
    const clienteEmail = authUser?.user?.email ?? ''
    await sendExtensionSolicitadaAdmin({
      userId,
      clienteNombre,
      clienteEmail,
      nivel,
      costo,
      dias: DIAS_EXTENSION,
      numeroCliente: perfil?.numero_cliente ?? null,
    })

    const msg = encodeURIComponent(`Hola! Quiero extender mi membresía ${nivel} por ${DIAS_EXTENSION} días. Transferí $${costo.toLocaleString('es-AR')} al alias juan3d.nx. Te mando el comprobante 👇`)
    redirect(`https://wa.me/543804559909?text=${msg}`)
  }

  redirect('/cuenta?tab=membresia')
}

// Cuenta de extensiones pendientes para badge en admin
export async function getExtensionPendientesCount(): Promise<number> {
  const sb = createServiceClient()
  const { count } = await sb
    .from('membresia_extensiones')
    .select('id', { count: 'exact', head: true })
    .eq('estado', 'pendiente')
  return count ?? 0
}

// Admin confirma o rechaza una extensión
export async function resolverExtensionMembresia(
  extensionId: string,
  accion: 'confirmado' | 'rechazado',
): Promise<{ error?: string }> {
  await getAdminUser()
  const supabase = createServiceClient()
  const { error } = await supabase
    .from('membresia_extensiones')
    .update({ estado: accion, confirmado_at: new Date().toISOString() })
    .eq('id', extensionId)
  if (error) return { error: 'Error al actualizar extensión' }
  return {}
}

export async function anularPedidoConfirmado(
  pedidoId: string,
  nota?: string,
): Promise<{ error?: string }> {
  await getAdminUser()
  const supabase = createServiceClient()

  const { data: pedido, error: fetchErr } = await supabase
    .from('filamento_pedidos')
    .select('*')
    .eq('id', pedidoId)
    .single()

  if (fetchErr || !pedido) return { error: 'Pedido no encontrado' }
  if (pedido.estado !== 'confirmado') return { error: 'Solo se pueden anular pedidos confirmados' }

  const items = pedido.items as FilamentoPedidoItem[]

  // Restaurar stock sumando los gramos de vuelta a gramos_sueltos
  for (const item of items) {
    const gramos = Math.round(item.rollos * 1000)
    const { data: fil } = await supabase
      .from('filamentos')
      .select('gramos_sueltos')
      .eq('id', item.filamento_id)
      .single()
    if (fil) {
      await supabase
        .from('filamentos')
        .update({ gramos_sueltos: fil.gramos_sueltos + gramos })
        .eq('id', item.filamento_id)
    }
  }

  // Eliminar registros de ventas generados al confirmar este pedido
  const { error: deleteErr } = await supabase
    .from('filamento_ventas')
    .delete()
    .eq('pedido_id', pedidoId)

  if (deleteErr) return { error: `Error al eliminar ventas del pedido: ${deleteErr.message}` }

  const notaFinal = nota ? nota : 'Anulado por admin (stock restaurado)'
  const { error } = await supabase
    .from('filamento_pedidos')
    .update({ estado: 'cancelado', nota: notaFinal, updated_at: new Date().toISOString() })
    .eq('id', pedidoId)

  if (error) return { error: error.message }

  revalidatePath('/admin/filamentos')
  revalidatePath('/filamentos')
  revalidatePath('/cuenta')
  return {}
}

// Público — el cliente puede cancelar sus propios pedidos pendientes
export async function cancelarMiPedido(pedidoId: string): Promise<{ error?: string }> {
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const db = createServiceClient()
  const { data: pedido } = await db
    .from('filamento_pedidos')
    .select('id, estado, user_id')
    .eq('id', pedidoId)
    .single()

  if (!pedido || pedido.user_id !== user.id) return { error: 'Pedido no encontrado' }
  if (pedido.estado !== 'pendiente') return { error: 'Solo podés cancelar pedidos pendientes de confirmación' }

  const { error } = await db
    .from('filamento_pedidos')
    .update({ estado: 'cancelado', updated_at: new Date().toISOString() })
    .eq('id', pedidoId)

  if (error) return { error: error.message }

  await db.from('filamento_reservas').delete().eq('pedido_id', pedidoId)

  revalidatePath('/cuenta')
  return {}
}

export async function getFilamentoPedidosPendientesCount(): Promise<number> {
  await getAdminUser()
  const supabase = createServiceClient()
  const { count } = await supabase
    .from('filamento_pedidos')
    .select('*', { count: 'exact', head: true })
    .eq('estado', 'pendiente')
  return count ?? 0
}

// ── Admin: membresías de todos los usuarios ────────────────────────────────────

export interface MembresiaAdminRow {
  userId: string
  nombre: string
  email: string
  nivel: NivelMembresia
  kgPeriodo: number
  diasRestantes: number
  periodoFin: string
  admin_apodo: string | null
}

export async function getMembresiasAdmin(): Promise<MembresiaAdminRow[]> {
  await getAdminUser()
  const supabase = createServiceClient()

  const [{ data: pedidosData }, { data: ventasData }, { data: usersData }, { data: notasData }] = await Promise.all([
    supabase.from('filamento_pedidos').select('user_id, updated_at, total_rollos').in('estado', ['confirmado', 'entregado']).not('user_id', 'is', null),
    supabase.from('filamento_ventas').select('user_id, fecha, gramos').not('user_id', 'is', null),
    supabase.auth.admin.listUsers({ perPage: 500 }),
    supabase.from('user_profiles').select('user_id, admin_apodo'),
  ])

  const userMap: Record<string, { nombre: string; email: string }> = {}
  for (const u of usersData?.users ?? []) {
    userMap[u.id] = {
      nombre: (u.user_metadata?.full_name as string) || (u.email?.split('@')[0] ?? ''),
      email: u.email ?? '',
    }
  }

  const notasMap: Record<string, string | null> = {}
  for (const n of notasData ?? []) notasMap[n.user_id] = n.admin_apodo ?? null

  // Agrupar eventos por user_id
  const eventosMap: Record<string, EventoCompra[]> = {}
  for (const p of pedidosData ?? []) {
    if (!p.user_id || !(p.total_rollos > 0)) continue
    ;(eventosMap[p.user_id] ??= []).push({ fecha_iso: p.updated_at, kg: p.total_rollos })
  }
  for (const v of ventasData ?? []) {
    if (!v.user_id || !(v.gramos > 0)) continue
    const fecha_iso = v.fecha.includes('T') ? v.fecha : `${v.fecha}T12:00:00Z`
    ;(eventosMap[v.user_id] ??= []).push({ fecha_iso, kg: v.gramos / 1000 })
  }

  const now = Date.now()
  const rows: MembresiaAdminRow[] = []

  for (const [userId, eventos] of Object.entries(eventosMap)) {
    const sorted = eventos.filter(e => e.kg > 0).sort((a, b) => new Date(a.fecha_iso).getTime() - new Date(b.fecha_iso).getTime())
    if (!sorted.length) continue
    const { periodoFin, kgPeriodo } = calcularPeriodo(sorted)
    const activo = periodoFin.getTime() > now
    if (!activo) continue
    const diasRestantes = Math.max(0, Math.ceil((periodoFin.getTime() - now) / 86400000))
    const tier = TIERS_MEMBRESIA.find(t => kgPeriodo >= t.min)
    if (!tier) continue
    rows.push({
      userId,
      nombre: userMap[userId]?.nombre ?? 'Usuario',
      email: userMap[userId]?.email ?? '',
      nivel: tier.label,
      kgPeriodo,
      diasRestantes,
      periodoFin: periodoFin.toISOString(),
      admin_apodo: notasMap[userId] ?? null,
    })
  }

  const orden: Record<string, number> = { Elite: 0, Plus: 1, Mayorista: 2 }
  return rows.sort((a, b) => (orden[a.nivel!] ?? 9) - (orden[b.nivel!] ?? 9) || b.kgPeriodo - a.kgPeriodo)
}

// ── Admin: extensiones pendientes ──────────────────────────────────────────────

export interface ExtensionPendiente {
  id: string
  userId: string
  nombre: string
  email: string
  dias: number
  costo: number
  createdAt: string
}

export async function getExtensionesAdmin(): Promise<ExtensionPendiente[]> {
  await getAdminUser()
  const supabase = createServiceClient()

  const { data } = await supabase
    .from('membresia_extensiones')
    .select('id, user_id, dias, costo, created_at')
    .eq('estado', 'pendiente')
    .order('created_at', { ascending: true })

  if (!data?.length) return []

  const userIds = [...new Set(data.map((r: { user_id: string }) => r.user_id))]
  const { data: users } = await supabase.auth.admin.listUsers({ perPage: 500 })
  const userMap: Record<string, { nombre: string; email: string }> = {}
  for (const u of users?.users ?? []) {
    userMap[u.id] = { nombre: u.user_metadata?.full_name ?? u.email ?? u.id, email: u.email ?? '' }
  }

  return data
    .filter((r: { user_id: string }) => userIds.includes(r.user_id))
    .map((r: { id: string; user_id: string; dias: number; costo: number; created_at: string }) => ({
      id: r.id,
      userId: r.user_id,
      nombre: userMap[r.user_id]?.nombre ?? 'Usuario',
      email: userMap[r.user_id]?.email ?? '',
      dias: r.dias,
      costo: r.costo,
      createdAt: r.created_at,
    }))
}
