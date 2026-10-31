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
  // Enriched en el admin para diagnosticar por qué un pedido no tuvo descuento.
  // Es la membresía ACTUAL del cliente, no la del momento del pedido.
  cliente_membresia?: {
    nivel: 'Platino' | 'Oro' | 'Plata' | null
    kgPeriodo: number
    diasRestantes: number
    esTrial: boolean
    kgParaProximoTier: number | null
  } | null
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

  // Calcular descuento server-side INCLUYENDO este pedido en el cálculo de membresía.
  // Si Jonathan tiene 0 kg previos y pide 5 kg hoy, cruza el hito de Plata y le toca
  // $2000/kg off. Si tenía 3 kg y pide 2 kg, también cruza. Idéntica lógica al
  // preview del carrito en FilamentosShop para que el precio final coincida.
  const descuento_por_rollo = await calcularDescuentoProyectado(user.id, total_rollos)

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

  const userIds = [...new Set(pedidos.filter(p => p.user_id).map(p => p.user_id!))]
  if (userIds.length) {
    // numero_cliente + membresía actual del cliente (bulk, para no hacer N+1)
    const [{ data: profiles }, { data: pedidosHistorial }, { data: ventasHistorial }, { data: trials }, { data: extensionesData }] = await Promise.all([
      supabase.from('user_profiles').select('user_id, numero_cliente').in('user_id', userIds),
      supabase.from('filamento_pedidos').select('user_id, updated_at, total_rollos').in('user_id', userIds).in('estado', ['confirmado', 'entregado']),
      // IMPORTANTE: excluir ventas con pedido_id — esas son copia de un pedido web
      // que ya se contabiliza por `filamento_pedidos`. Si no filtramos, se suman doble.
      supabase.from('filamento_ventas').select('user_id, fecha, gramos').in('user_id', userIds).is('pedido_id', null),
      supabase.from('membresia_trial').select('user_id, trial_fin').in('user_id', userIds),
      supabase.from('membresia_extensiones').select('user_id, dias, estado').in('user_id', userIds),
    ])

    const numeroMap: Record<string, number> = {}
    for (const p of profiles ?? []) numeroMap[p.user_id] = p.numero_cliente

    const eventosMap: Record<string, EventoCompra[]> = {}
    for (const p of pedidosHistorial ?? []) {
      if (!p.user_id || !(p.total_rollos > 0)) continue
      ;(eventosMap[p.user_id] ??= []).push({ fecha_iso: p.updated_at, kg: p.total_rollos })
    }
    for (const v of ventasHistorial ?? []) {
      if (!v.user_id || !(v.gramos > 0)) continue
      const fecha_iso = v.fecha.includes('T') ? v.fecha : `${v.fecha}T12:00:00Z`
      ;(eventosMap[v.user_id] ??= []).push({ fecha_iso, kg: v.gramos / 1000 })
    }

    const trialMap: Record<string, string> = {}
    for (const t of trials ?? []) if (t.trial_fin) trialMap[t.user_id] = t.trial_fin

    const extensionDiasMap: Record<string, number> = {}
    for (const e of extensionesData ?? []) {
      if (e.estado === 'confirmado' || e.estado === 'pendiente') {
        extensionDiasMap[e.user_id] = (extensionDiasMap[e.user_id] ?? 0) + (e.dias ?? 0)
      }
    }

    const now = Date.now()
    const membresiaMap: Record<string, FilamentoPedido['cliente_membresia']> = {}
    for (const uid of userIds) {
      const eventos = (eventosMap[uid] ?? [])
        .filter(e => e.kg > 0)
        .sort((a, b) => new Date(a.fecha_iso).getTime() - new Date(b.fecha_iso).getTime())

      const trialFin = trialMap[uid]
      if (!eventos.length) {
        if (trialFin && new Date(trialFin).getTime() > now) {
          const diasRestantes = Math.max(0, Math.ceil((new Date(trialFin).getTime() - now) / 86400000))
          membresiaMap[uid] = { nivel: 'Plata', kgPeriodo: 0, diasRestantes, esTrial: true, kgParaProximoTier: 10 }
        } else {
          membresiaMap[uid] = { nivel: null, kgPeriodo: 0, diasRestantes: 0, esTrial: false, kgParaProximoTier: 5 }
        }
        continue
      }

      const extDias = extensionDiasMap[uid] ?? 0
      const { periodoFin, kgPeriodo } = calcularPeriodo(eventos, extDias)
      const activo = periodoFin.getTime() > now
      const diasRestantes = activo ? Math.max(0, Math.ceil((periodoFin.getTime() - now) / 86400000)) : 0
      const tier = activo ? TIERS_MEMBRESIA.find(t => kgPeriodo >= t.min) : undefined
      const nivel = tier?.label ?? null
      const siguiente = siguienteTier(nivel)
      const kgParaProximoTier = siguiente ? Math.max(0, siguiente.min - (activo ? kgPeriodo : 0)) : null
      membresiaMap[uid] = { nivel, kgPeriodo: activo ? kgPeriodo : 0, diasRestantes, esTrial: false, kgParaProximoTier }
    }

    for (const p of pedidos) {
      p.numero_cliente = p.user_id ? (numeroMap[p.user_id] ?? null) : null
      p.cliente_membresia = p.user_id ? (membresiaMap[p.user_id] ?? null) : null
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
  // Al cancelar, liberar la reserva de stock y revertir cualquier coin del pedido
  if (estado === 'cancelado') {
    await supabase.from('filamento_reservas').delete().eq('pedido_id', id)
    const { revertirCoinsDePedido } = await import('./ddd-coins')
    await revertirCoinsDePedido(id)
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

  // Pre-fetch de todos los costos en una sola query (evita N+1)
  const filamentoIds = Array.from(new Set(items.map(i => i.filamento_id)))
  const { data: costosData } = await supabase
    .from('filamentos')
    .select('id, costo_kg')
    .in('id', filamentoIds)
  const costoById = new Map<string, number>(
    (costosData ?? []).map((f: { id: string; costo_kg: number | null }) => [f.id, f.costo_kg ?? 0])
  )

  // Precio real pagado por kg = precio de catálogo - descuento por membresía
  const descuentoPorRollo = pedido.descuento_por_rollo ?? 0

  // Procesar items en paralelo (cada RPC es atómico internamente)
  const results = await Promise.all(items.map(async (item) => {
    const gramos = Math.round(item.rollos * 1000)
    const precioRealPorKg = Math.max(0, item.precio_unitario - descuentoPorRollo)

    const { data: rpcResult, error: rpcError } = await supabase
      .rpc('descontar_stock_filamento', {
        p_filamento_id: item.filamento_id,
        p_gramos: gramos,
        p_rollos: item.rollos,
      })

    if (rpcError || !(rpcResult as { ok: boolean })?.ok) {
      const msg = (rpcResult as { error?: string })?.error ?? rpcError?.message ?? 'Error descontando stock'
      return { ok: false, error: `${item.color}: ${msg}` }
    }

    await supabase
      .from('filamento_ventas')
      .insert({
        filamento_id: item.filamento_id,
        gramos,
        precio_kg: precioRealPorKg,
        costo_kg: costoById.get(item.filamento_id) ?? 0,
        cliente: pedido.cliente_nombre,
        nota: descuentoPorRollo > 0
          ? `Pedido web N°${pedido.numero} — descuento membresía: -$${descuentoPorRollo.toLocaleString('es-AR')}/kg`
          : `Pedido web N°${pedido.numero}`,
        fecha,
        user_id: pedido.user_id ?? null,
        pedido_id: pedidoId,
      })

    return { ok: true as const }
  }))

  for (const r of results) {
    if (!r.ok) errors.push(r.error)
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

  // Obtener pedido para validar estado y recalcular descuento INCLUYENDO este pedido
  const { data: pedidoRow } = await supabase
    .from('filamento_pedidos')
    .select('user_id, descuento_coins, estado')
    .eq('id', pedidoId)
    .single()
  if (!pedidoRow) return { error: 'Pedido no encontrado' }
  // Si ya está confirmado o entregado, el stock está descontado y las ventas registradas.
  // Editar los items dejaría todo inconsistente. Para modificar, hay que anular y crear uno nuevo.
  if (pedidoRow.estado !== 'pendiente') {
    return { error: `Solo se pueden editar pedidos pendientes. Este está "${pedidoRow.estado}" — para modificarlo, anulá y creá uno nuevo.` }
  }
  const descuento_por_rollo = pedidoRow.user_id
    ? await calcularDescuentoProyectado(pedidoRow.user_id, total_rollos, pedidoId)
    : 0
  const descuento_coins = pedidoRow.descuento_coins ?? 0

  const subtotal = items.reduce((s, i) => s + i.rollos * Math.max(0, i.precio_unitario - descuento_por_rollo), 0)
  // Si el nuevo subtotal es menor al descuento_coins ya canjeado, bloqueamos la
  // edición: significaría quemar coins sin que el cliente reciba su contrapartida.
  // El admin debe anular el pedido (que revierte los coins) y crear uno nuevo.
  if (descuento_coins > subtotal) {
    return {
      error:
        `El nuevo subtotal ($${subtotal.toLocaleString('es-AR')}) es menor al canje de coins ya aplicado ($${descuento_coins.toLocaleString('es-AR')}). Para reducir el pedido, anulalo y crealo de nuevo (los coins se devuelven).`,
    }
  }
  const total = Math.max(0, subtotal - descuento_coins)
  const { error } = await supabase
    .from('filamento_pedidos')
    .update({ items, total_rollos, descuento_por_rollo, total, updated_at: new Date().toISOString() })
    .eq('id', pedidoId)

  if (error) return { error: error.message }
  revalidatePath('/admin/filamentos')
  return {}
}

// Admin: recalcula el descuento de un pedido ya creado según la membresía
// proyectada (incluyendo el propio pedido). Útil cuando un pedido quedó sin
// descuento por un bug previo del cálculo backend.
export async function recalcularDescuentoPedido(pedidoId: string): Promise<{ error?: string; descuento_aplicado?: number; total_anterior?: number; total_nuevo?: number }> {
  await getAdminUser()
  const supabase = createServiceClient()
  const { data: pedido, error: readErr } = await supabase
    .from('filamento_pedidos')
    .select('user_id, items, total_rollos, descuento_coins, total')
    .eq('id', pedidoId)
    .single()
  if (readErr || !pedido) return { error: readErr?.message ?? 'Pedido no encontrado' }
  if (!pedido.user_id) return { error: 'El pedido no tiene cliente registrado' }

  const items = pedido.items as FilamentoPedidoItem[]
  const descuento_por_rollo = await calcularDescuentoProyectado(pedido.user_id, pedido.total_rollos ?? 0, pedidoId)
  const descuento_coins = pedido.descuento_coins ?? 0
  const subtotal = items.reduce((s, i) => s + i.rollos * Math.max(0, i.precio_unitario - descuento_por_rollo), 0)
  const total = Math.max(0, subtotal - descuento_coins)

  // NO mutar updated_at: `getMembresiaCliente` lo usa como fecha del evento.
  // Si lo tocamos, el pedido histórico "salta" a hoy y el cálculo de membresía
  // futura se desincroniza.
  const { error: updErr } = await supabase
    .from('filamento_pedidos')
    .update({ descuento_por_rollo, total })
    .eq('id', pedidoId)
  if (updErr) return { error: updErr.message }

  revalidatePath('/admin/filamentos')
  return { descuento_aplicado: descuento_por_rollo, total_anterior: pedido.total ?? 0, total_nuevo: total }
}

import { TIERS_MEMBRESIA, calcularPeriodo, costoExtension, DIAS_EXTENSION, siguienteTier, type EventoCompra, type NivelMembresia, type MembresiaStatus } from '@/lib/membresia-helpers'
export type { NivelMembresia, MembresiaStatus } from '@/lib/membresia-helpers'

// Calcula el descuento por kg que corresponde al cliente INCLUYENDO el pedido
// que está haciendo ahora. Si al sumar los kg del pedido cruza el umbral de
// Plata/Oro/Platino, aplica el descuento del tier correspondiente al mismo
// pedido. Si el pedido ya existe (edición o recálculo), se excluye del
// histórico para evitar doble conteo. Fallback a trial Plata cuando no hay
// histórico pero el usuario tiene trial activo.
async function calcularDescuentoProyectado(
  userId: string,
  kgNuevoPedido: number,
  excludePedidoId?: string,
): Promise<number> {
  const supabase = createServiceClient()

  const [pedidosRes, ventasRes, extensionesRes, trialRes] = await Promise.all([
    supabase
      .from('filamento_pedidos')
      .select('id, updated_at, total_rollos')
      .eq('user_id', userId)
      .in('estado', ['confirmado', 'entregado']),
    supabase
      .from('filamento_ventas')
      .select('fecha, gramos')
      .eq('user_id', userId)
      .is('pedido_id', null), // excluir copias de pedidos web
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

  const nowMs = Date.now()
  const trialFin = trialRes.data?.trial_fin as string | undefined
  const trialActivo = !!(trialFin && new Date(trialFin).getTime() > nowMs)

  const eventosExistentes: EventoCompra[] = [
    ...(pedidosRes.data ?? [])
      .filter((p: { id: string; total_rollos: number }) => p.id !== excludePedidoId && p.total_rollos > 0)
      .map((p: { updated_at: string; total_rollos: number }) => ({ fecha_iso: p.updated_at, kg: p.total_rollos })),
    ...(ventasRes.data ?? [])
      .filter((v: { gramos: number }) => v.gramos > 0)
      .map((v: { fecha: string; gramos: number }) => ({
        fecha_iso: v.fecha.includes('T') ? v.fecha : `${v.fecha}T12:00:00Z`,
        kg: v.gramos / 1000,
      })),
  ]

  const nuevoEvento: EventoCompra = { fecha_iso: new Date().toISOString(), kg: kgNuevoPedido }
  const todos = [...eventosExistentes, nuevoEvento]
    .filter(e => e.kg > 0)
    .sort((a, b) => new Date(a.fecha_iso).getTime() - new Date(b.fecha_iso).getTime())

  const plata = TIERS_MEMBRESIA.find(t => t.label === 'Plata')!

  if (!todos.length) {
    return trialActivo ? plata.descuento : 0
  }

  const extensionDias = (extensionesRes.data ?? [])
    .filter((e: { estado: string }) => e.estado === 'confirmado' || e.estado === 'pendiente')
    .reduce((s: number, e: { dias: number }) => s + (e.dias ?? 0), 0)

  const { periodoFin, kgPeriodo } = calcularPeriodo(todos, extensionDias)
  const activo = periodoFin.getTime() > nowMs

  const tierPorKg = activo ? TIERS_MEMBRESIA.find(t => kgPeriodo >= t.min) : undefined
  if (tierPorKg) return tierPorKg.descuento
  if (trialActivo) return plata.descuento
  return 0
}

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
      .eq('user_id', userId)
      .is('pedido_id', null), // excluir copias de pedidos web (ya contabilizados en filamento_pedidos)
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
      // Trial dura 5 días (crear_trial_nuevo_usuario trigger). periodoInicio = trial_fin - 5 días.
      // Antes se reportaba trial_fin como inicio, confundiendo al usuario en la UI.
      const TRIAL_DIAS = 5
      const trialInicio = new Date(trialFin.getTime() - TRIAL_DIAS * 24 * 60 * 60 * 1000)
      const mayoristaTier = TIERS_MEMBRESIA.find(t => t.label === 'Plata')!
      return {
        kgPeriodo: 0,
        periodoInicio: trialInicio.toISOString(),
        periodoFin: trialFin.toISOString(),
        diasRestantes,
        nivel: 'Plata',
        descuento: mayoristaTier.descuento,
        totalHistorico: 0,
        extensionPendiente: false,
        esTrial: true,
        ultimoNivel: null,
        kgUltimoPeriodo: 0,
        diasDesdeVencimiento: 0,
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
  const diasDesdeVencimiento = activo ? 0 : Math.ceil((nowMs - periodoFin.getTime()) / (24 * 60 * 60 * 1000))

  const tierActivo = activo ? TIERS_MEMBRESIA.find(t => kgPeriodo >= t.min) : undefined
  const nivel: NivelMembresia = tierActivo?.label ?? null

  // Nivel del último período (incluso si ya venció) — para mostrar "venció tu Plata" etc.
  const tierUltimo = TIERS_MEMBRESIA.find(t => kgPeriodo >= t.min)
  const ultimoNivel: NivelMembresia = tierUltimo?.label ?? null

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
    ultimoNivel,
    kgUltimoPeriodo: kgPeriodo,
    diasDesdeVencimiento,
  }
}

// Cliente solicita extensión — registra como pendiente y notifica admin.
// Ya no redirige a WhatsApp automáticamente: el modal controla el flow y
// muestra feedback de éxito con el botón de WhatsApp al cliente.
export async function solicitarExtensionMembresia(): Promise<{ error?: string; yaExiste?: boolean }> {
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }
  const userId = user.id

  const sb = createServiceClient()

  // Verificar que no haya ya una pendiente
  const { data: existente } = await sb
    .from('membresia_extensiones')
    .select('id')
    .eq('user_id', userId)
    .eq('estado', 'pendiente')
    .maybeSingle()

  if (existente) {
    return { yaExiste: true }
  }

  // Calcular costo según nivel actual y registrar solicitud
  const membresiaActual = await getMembresiaCliente(userId)
  const costo = costoExtension(membresiaActual?.nivel ?? null)
  const nivel = membresiaActual?.nivel ?? 'Plata'
  await sb.from('membresia_extensiones').insert({ user_id: userId, dias: DIAS_EXTENSION, costo })

  // Email al admin en background
  try {
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
  } catch (err) {
    console.error('Error enviando email de extensión:', err)
  }

  const { revalidatePath } = await import('next/cache')
  revalidatePath('/cuenta')
  return {}
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

  // Revertir coins (compra ganada + canje aplicado) para que no queden ni puntos
  // "gratis" ni débitos sin descuento efectivo.
  const { revertirCoinsDePedido } = await import('./ddd-coins')
  await revertirCoinsDePedido(pedidoId)

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
  const { revertirCoinsDePedido } = await import('./ddd-coins')
  await revertirCoinsDePedido(pedidoId)

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
    supabase.from('filamento_ventas').select('user_id, fecha, gramos').not('user_id', 'is', null).is('pedido_id', null), // excluir copias de pedidos web
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

  const orden: Record<string, number> = { Platino: 0, Oro: 1, Plata: 2 }
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
