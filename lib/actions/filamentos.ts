'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/server'
import { getAdminUser } from './auth'
import type { Material, Filamento, FilamentoMovimiento } from '@/lib/filamentos-helpers'

// ── Filamentos ────────────────────────────────────────────────────────────────

export async function getFilamentos(): Promise<Filamento[]> {
  await getAdminUser()
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('filamentos')
    .select('*')
    .order('material')
    .order('nombre')
  return (data ?? []) as Filamento[]
}

// Público — sin auth, solo filamentos con stock disponible (descuenta reservas activas)
export async function getFilamentosDisponibles(): Promise<Filamento[]> {
  const supabase = createServiceClient()
  const now = new Date().toISOString()

  const [{ data: fils }, { data: reservas }] = await Promise.all([
    supabase
      .from('filamentos')
      .select('id, nombre, marca, tipo, material, color, rollos_cerrados, gramos_sueltos, peso_rollo_gr, precio_kg, imagen_url, imagen_url_2, imagen_url_3')
      .or('rollos_cerrados.gt.0,gramos_sueltos.gt.100')
      .eq('oculto', false)
      .order('material')
      .order('color'),
    supabase
      .from('filamento_reservas')
      .select('filamento_id, gramos')
      .gt('reservado_hasta', now),
  ])

  const porFilamento: Record<string, number> = {}
  for (const r of (reservas ?? [])) {
    porFilamento[r.filamento_id] = (porFilamento[r.filamento_id] ?? 0) + r.gramos
  }

  return (fils ?? []).map((f: any) => ({
    ...f,
    gramos_reservados: porFilamento[f.id] ?? 0,
  })) as Filamento[]
}

export async function createFilamento(data: {
  nombre: string
  material: Material
  color: string
  rollos_cerrados: number
  gramos_sueltos: number
  peso_rollo_gr: number
  nota: string
}): Promise<{ filamento?: Filamento; error?: string }> {
  await getAdminUser()
  if (!data.nombre.trim()) return { error: 'El nombre es requerido' }
  const supabase = createServiceClient()
  const { data: row, error } = await supabase
    .from('filamentos')
    .insert({ ...data, nombre: data.nombre.trim() })
    .select()
    .single()
  if (error) return { error: error.message }
  revalidatePath('/admin/filamentos')
  return { filamento: row as Filamento }
}

export async function updateFilamento(
  id: string,
  data: Partial<Omit<Filamento, 'id' | 'created_at' | 'updated_at'>>
): Promise<{ error?: string }> {
  await getAdminUser()
  const supabase = createServiceClient()
  const { error } = await supabase.from('filamentos').update(data).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/filamentos')
  return {}
}

export async function deleteFilamento(id: string): Promise<{ error?: string }> {
  await getAdminUser()
  const supabase = createServiceClient()
  const { error } = await supabase.from('filamentos').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/filamentos')
  return {}
}

// ── Movimientos (compras de filamento) ────────────────────────────────────────

export async function getMovimientos(filamentoId: string): Promise<FilamentoMovimiento[]> {
  await getAdminUser()
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('filamento_movimientos')
    .select('*')
    .eq('filamento_id', filamentoId)
    .order('fecha', { ascending: false })
    .order('created_at', { ascending: false })
  return (data ?? []) as FilamentoMovimiento[]
}

// Registra una compra y actualiza el stock del filamento
export async function registrarCompra(
  filamentoId: string,
  compra: { rollos: number; gramos: number; fecha: string; nota: string }
): Promise<{ movimiento?: FilamentoMovimiento; filamento?: Filamento; error?: string }> {
  await getAdminUser()
  if (compra.rollos <= 0 && compra.gramos <= 0) return { error: 'Indicá al menos rollos o gramos' }

  const supabase = createServiceClient()

  // 1. Obtener stock actual
  const { data: actual, error: fetchErr } = await supabase
    .from('filamentos')
    .select('rollos_cerrados, gramos_sueltos')
    .eq('id', filamentoId)
    .single()
  if (fetchErr || !actual) return { error: 'Filamento no encontrado' }

  // 2. Guardar movimiento
  const { data: mov, error: movErr } = await supabase
    .from('filamento_movimientos')
    .insert({ filamento_id: filamentoId, ...compra })
    .select()
    .single()
  if (movErr) return { error: movErr.message }

  // 3. Actualizar stock sumando lo recibido
  const nuevoRollos = (actual.rollos_cerrados ?? 0) + compra.rollos
  const nuevoGramos = (actual.gramos_sueltos ?? 0) + compra.gramos
  const { data: updated, error: updErr } = await supabase
    .from('filamentos')
    .update({ rollos_cerrados: nuevoRollos, gramos_sueltos: nuevoGramos })
    .eq('id', filamentoId)
    .select()
    .single()
  if (updErr) return { error: updErr.message }

  revalidatePath('/admin/filamentos')
  return { movimiento: mov as FilamentoMovimiento, filamento: updated as Filamento }
}

export async function deleteMovimiento(
  id: string,
  filamentoId: string,
  rollos: number,
  gramos: number
): Promise<{ filamento?: Filamento; error?: string }> {
  await getAdminUser()
  const supabase = createServiceClient()

  // Obtener stock actual
  const { data: actual } = await supabase
    .from('filamentos')
    .select('rollos_cerrados, gramos_sueltos')
    .eq('id', filamentoId)
    .single()

  // Eliminar movimiento
  const { error: delErr } = await supabase.from('filamento_movimientos').delete().eq('id', id)
  if (delErr) return { error: delErr.message }

  // Revertir stock (no bajar de 0)
  if (actual) {
    const nuevoRollos = Math.max(0, (actual.rollos_cerrados ?? 0) - rollos)
    const nuevoGramos = Math.max(0, (actual.gramos_sueltos ?? 0) - gramos)
    const { data: updated } = await supabase
      .from('filamentos')
      .update({ rollos_cerrados: nuevoRollos, gramos_sueltos: nuevoGramos })
      .eq('id', filamentoId)
      .select()
      .single()
    revalidatePath('/admin/filamentos')
    return { filamento: updated as Filamento }
  }

  revalidatePath('/admin/filamentos')
  return {}
}

// ── Ventas de filamento ───────────────────────────────────────────────────────

import type { VentaFilamento } from '@/lib/filamentos-helpers'

export async function getVentasDeCliente(clienteId: string): Promise<VentaFilamento[]> {
  await getAdminUser()
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('filamento_ventas')
    .select('*, filamentos(nombre, color, material, marca)')
    .eq('cliente_id', clienteId)
    .order('fecha', { ascending: false })
  return (data ?? []).map((r: any) => ({
    ...r,
    filamento_nombre: r.filamentos?.nombre ?? '',
    filamento_color: r.filamentos?.color ?? '',
    filamento_material: r.filamentos?.material ?? '',
    filamento_marca: r.filamentos?.marca ?? '',
  })) as VentaFilamento[]
}

// Retorna los kg totales vendidos a un cliente en el mes dado (formato 'YYYY-MM')
export async function getKgMensualesCliente(clienteId: string, mes: string): Promise<number> {
  await getAdminUser()
  if (!clienteId) return 0
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('filamento_ventas')
    .select('gramos')
    .eq('cliente_id', clienteId)
    .gte('fecha', `${mes}-01`)
    .lte('fecha', `${mes}-31`)
  return (data ?? []).reduce((s: number, r: { gramos: number }) => s + r.gramos / 1000, 0)
}

export async function registrarVentaFilamento(
  filamentoId: string,
  venta: { gramos: number; precio_kg: number; costo_kg: number; cliente: string; cliente_id?: string | null; user_id?: string | null; nota: string; fecha: string }
): Promise<{ venta?: VentaFilamento; filamento?: Filamento; error?: string }> {
  await getAdminUser()
  if (venta.gramos <= 0) return { error: 'Los gramos deben ser mayores a 0' }

  const supabase = createServiceClient()

  // 1. Stock actual
  const { data: actual, error: fetchErr } = await supabase
    .from('filamentos')
    .select('gramos_sueltos, rollos_cerrados, peso_rollo_gr')
    .eq('id', filamentoId)
    .single()
  if (fetchErr || !actual) return { error: 'Filamento no encontrado' }

  const totalDisp = actual.rollos_cerrados * actual.peso_rollo_gr + actual.gramos_sueltos
  if (venta.gramos > totalDisp) return { error: `Stock insuficiente (${Math.round(totalDisp)}g disponibles)` }

  // 2. Guardar venta
  const { data: row, error: ventaErr } = await supabase
    .from('filamento_ventas')
    .insert({ filamento_id: filamentoId, ...venta })
    .select()
    .single()
  if (ventaErr) return { error: ventaErr.message }

  // 3. Descontar del stock (de gramos_sueltos primero, luego rollos)
  let restante = venta.gramos
  let nuevoSueltos = actual.gramos_sueltos
  let nuevoRollos = actual.rollos_cerrados

  if (nuevoSueltos >= restante) {
    nuevoSueltos -= restante
    restante = 0
  } else {
    restante -= nuevoSueltos
    nuevoSueltos = 0
  }
  if (restante > 0) {
    const rollosNecesarios = Math.ceil(restante / actual.peso_rollo_gr)
    nuevoRollos = Math.max(0, nuevoRollos - rollosNecesarios)
    const gramosDeRollos = rollosNecesarios * actual.peso_rollo_gr
    nuevoSueltos = Math.max(0, gramosDeRollos - restante)
  }

  const { data: updated, error: updErr } = await supabase
    .from('filamentos')
    .update({ gramos_sueltos: nuevoSueltos, rollos_cerrados: nuevoRollos })
    .eq('id', filamentoId)
    .select()
    .single()
  if (updErr) return { error: updErr.message }

  revalidatePath('/admin/filamentos')
  return { venta: row as VentaFilamento, filamento: updated as Filamento }
}

export async function descontarUsoPropioFilamento(
  filamentoId: string,
  gramos: number
): Promise<{ filamento?: Filamento; error?: string }> {
  await getAdminUser()
  if (gramos <= 0) return { error: 'Los gramos deben ser mayores a 0' }

  const supabase = createServiceClient()
  const { data: actual, error: fetchErr } = await supabase
    .from('filamentos')
    .select('gramos_sueltos, rollos_cerrados, peso_rollo_gr')
    .eq('id', filamentoId)
    .single()
  if (fetchErr || !actual) return { error: 'Filamento no encontrado' }

  const totalDisp = actual.rollos_cerrados * actual.peso_rollo_gr + actual.gramos_sueltos
  if (gramos > totalDisp) return { error: `Stock insuficiente (${Math.round(totalDisp)}g disponibles)` }

  let restante = gramos
  let nuevoSueltos = actual.gramos_sueltos
  let nuevoRollos = actual.rollos_cerrados

  if (nuevoSueltos >= restante) {
    nuevoSueltos -= restante
    restante = 0
  } else {
    restante -= nuevoSueltos
    nuevoSueltos = 0
  }
  if (restante > 0) {
    const rollosNecesarios = Math.ceil(restante / actual.peso_rollo_gr)
    nuevoRollos = Math.max(0, nuevoRollos - rollosNecesarios)
    nuevoSueltos = Math.max(0, rollosNecesarios * actual.peso_rollo_gr - restante)
  }

  const { data: updated, error: updErr } = await supabase
    .from('filamentos')
    .update({ gramos_sueltos: nuevoSueltos, rollos_cerrados: nuevoRollos })
    .eq('id', filamentoId)
    .select()
    .single()
  if (updErr) return { error: updErr.message }

  revalidatePath('/admin/filamentos')
  return { filamento: updated as Filamento }
}

export async function getVentasFilamento(filamentoId: string): Promise<VentaFilamento[]> {
  await getAdminUser()
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('filamento_ventas')
    .select('*')
    .eq('filamento_id', filamentoId)
    .order('fecha', { ascending: false })
    .order('created_at', { ascending: false })
  return (data ?? []) as VentaFilamento[]
}

export async function getHistorialVentasFilamentos(): Promise<VentaFilamento[]> {
  await getAdminUser()
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('filamento_ventas')
    .select('*, filamentos(nombre, color, material)')
    .order('fecha', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(200)
  return (data ?? []).map((r: any) => ({
    ...r,
    filamento_nombre: r.filamentos?.nombre ?? '',
    filamento_color: r.filamentos?.color ?? '',
    filamento_material: r.filamentos?.material ?? '',
  })) as VentaFilamento[]
}

// ── Vinculación de historial a usuarios registrados ──────────────────────────

export interface GrupoVentasSinUsuario {
  cliente: string
  totalVentas: number
  totalKg: number
  totalPesos: number
  ultimaFecha: string
  ids: string[]
}

export async function getVentasAgrupadasSinUsuario(): Promise<GrupoVentasSinUsuario[]> {
  await getAdminUser()
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('filamento_ventas')
    .select('id, cliente, gramos, precio_kg, fecha')
    .is('user_id', null)
    .order('fecha', { ascending: false })

  if (!data?.length) return []

  const mapa: Record<string, GrupoVentasSinUsuario> = {}
  for (const v of data) {
    if (!mapa[v.cliente]) {
      mapa[v.cliente] = { cliente: v.cliente, totalVentas: 0, totalKg: 0, totalPesos: 0, ultimaFecha: v.fecha, ids: [] }
    }
    mapa[v.cliente].totalVentas++
    mapa[v.cliente].totalKg += v.gramos / 1000
    mapa[v.cliente].totalPesos += (v.gramos / 1000) * v.precio_kg
    mapa[v.cliente].ids.push(v.id)
    if (v.fecha > mapa[v.cliente].ultimaFecha) mapa[v.cliente].ultimaFecha = v.fecha
  }

  return Object.values(mapa).sort((a, b) => b.ultimaFecha.localeCompare(a.ultimaFecha))
}

export interface UsuarioRegistrado {
  id: string
  email: string
  nombre: string
  avatar_url: string | null
  created_at: string
  // Datos del perfil (user_profiles) para buscar y mostrar en admin
  dni: string | null
  telefono: string | null
  numero_cliente: number | null
  apodo: string | null
}

export async function getUsuariosRegistrados(): Promise<UsuarioRegistrado[]> {
  await getAdminUser()
  const supabase = createServiceClient()

  const [usersRes, perfilesRes] = await Promise.all([
    supabase.auth.admin.listUsers({ perPage: 200 }),
    supabase.from('user_profiles').select('user_id, dni, telefono, numero_cliente, apodo'),
  ])
  if (usersRes.error) return []

  // Index de perfiles por user_id
  type PerfilRow = { user_id: string; dni: string | null; telefono: string | null; numero_cliente: number | null; apodo: string | null }
  const perfiles = new Map<string, PerfilRow>()
  for (const p of (perfilesRes.data ?? []) as PerfilRow[]) {
    perfiles.set(p.user_id, p)
  }

  return usersRes.data.users.map((u: { id: string; email?: string; user_metadata?: Record<string, unknown>; created_at: string }) => {
    const p = perfiles.get(u.id)
    return {
      id: u.id,
      email: u.email ?? '',
      nombre: (u.user_metadata?.full_name as string) ?? u.email ?? u.id,
      avatar_url: (u.user_metadata?.avatar_url as string) ?? null,
      created_at: u.created_at,
      dni: p?.dni ?? null,
      telefono: p?.telefono ?? null,
      numero_cliente: p?.numero_cliente ?? null,
      apodo: p?.apodo ?? null,
    }
  })
}

export async function asignarUserAVentas(
  userId: string,
  clienteNombre: string
): Promise<{ asignadas: number; error?: string }> {
  await getAdminUser()
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('filamento_ventas')
    .update({ user_id: userId })
    .eq('cliente', clienteNombre)
    .is('user_id', null)
    .select('id')
  if (error) return { asignadas: 0, error: error.message }
  revalidatePath('/admin/filamentos/vincular')
  return { asignadas: data?.length ?? 0 }
}

export async function getVentasDeUsuario(userId: string): Promise<VentaFilamento[]> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('filamento_ventas')
    .select('*, filamentos(nombre, color, material, marca)')
    .eq('user_id', userId)
    .order('fecha', { ascending: false })
  return (data ?? []).map((r: any) => ({
    ...r,
    filamento_nombre: r.filamentos?.nombre ?? '',
    filamento_color: r.filamentos?.color ?? '',
    filamento_material: r.filamentos?.material ?? '',
    filamento_marca: r.filamentos?.marca ?? '',
  })) as VentaFilamento[]
}

export async function editarClienteVenta(
  ventaId: string,
  { cliente, userId }: { cliente: string; userId: string | null }
): Promise<{ error?: string }> {
  await getAdminUser()
  const supabase = createServiceClient()
  const { error } = await supabase
    .from('filamento_ventas')
    .update({ cliente: cliente.trim(), user_id: userId })
    .eq('id', ventaId)
  if (error) return { error: error.message }
  revalidatePath('/admin/filamentos')
  return {}
}

export async function deleteVentaFilamento(
  id: string,
  filamentoId: string,
  gramos: number
): Promise<{ filamento?: Filamento; error?: string }> {
  await getAdminUser()
  const supabase = createServiceClient()

  const { data: actual } = await supabase
    .from('filamentos')
    .select('gramos_sueltos')
    .eq('id', filamentoId)
    .single()

  const { error: delErr } = await supabase.from('filamento_ventas').delete().eq('id', id)
  if (delErr) return { error: delErr.message }

  if (actual) {
    const { data: updated } = await supabase
      .from('filamentos')
      .update({ gramos_sueltos: (actual.gramos_sueltos ?? 0) + gramos })
      .eq('id', filamentoId)
      .select()
      .single()
    revalidatePath('/admin/filamentos')
    return { filamento: updated as Filamento }
  }

  revalidatePath('/admin/filamentos')
  return {}
}

// ── Filamentos agotados (para alertas de stock) ───────────────────────────────

export async function getFilamentosAgotados(): Promise<Filamento[]> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('filamentos')
    .select('id, nombre, marca, tipo, material, color, rollos_cerrados, gramos_sueltos, peso_rollo_gr, imagen_url, imagen_url_2, imagen_url_3')
    .eq('rollos_cerrados', 0)
    .lte('gramos_sueltos', 100)
    .order('material')
    .order('color')
  return (data ?? []).map((f: any) => ({ ...f, gramos_reservados: 0 })) as Filamento[]
}

export async function suscribirAlertaStock(filamentoId: string): Promise<{ error?: string }> {
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Necesitás iniciar sesión' }

  const db = createServiceClient()
  const { error } = await db
    .from('filamento_alertas_stock')
    .upsert({ user_id: user.id, filamento_id: filamentoId }, { onConflict: 'user_id,filamento_id' })

  if (error) return { error: error.message }
  return {}
}

export async function getMisAlertasStock(): Promise<string[]> {
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const db = createServiceClient()
  const { data } = await db
    .from('filamento_alertas_stock')
    .select('filamento_id')
    .eq('user_id', user.id)

  return (data ?? []).map((r: any) => r.filamento_id as string)
}

// ── Carrito persistente ───────────────────────────────────────────────────────

export async function getCarritoUsuario(): Promise<{ filamento_id: string; rollos: number }[]> {
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const db = createServiceClient()
  const { data } = await db
    .from('filamento_carrito')
    .select('items')
    .eq('user_id', user.id)
    .single()

  return (data?.items ?? []) as { filamento_id: string; rollos: number }[]
}

export async function saveCarritoUsuario(
  items: { filamento_id: string; rollos: number }[]
): Promise<void> {
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const itemsSaneados = items.slice(0, 50)
  const db = createServiceClient()
  await db
    .from('filamento_carrito')
    .upsert({ user_id: user.id, items: itemsSaneados, updated_at: new Date().toISOString() })
}

export async function limpiarCarritoUsuario(): Promise<void> {
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const db = createServiceClient()
  await db
    .from('filamento_carrito')
    .upsert({ user_id: user.id, items: [], updated_at: new Date().toISOString() })
}

// ── Admin: demanda ────────────────────────────────────────────────────────────

export interface DemandaUsuario {
  user_id: string
  nombre: string
  email: string
  rollos?: number  // solo para carrito
}

export interface DemandaFilamento {
  filamento_id: string
  color: string
  material: string
  marca: string
  alertas: number
  carrito_rollos: number
  carrito_usuarios: number
  alertas_lista: DemandaUsuario[]
  carrito_lista: DemandaUsuario[]
}

export async function getDemandaFilamentos(): Promise<DemandaFilamento[]> {
  await getAdminUser()
  const supabase = createServiceClient()

  const [{ data: alertas }, { data: carritos }, { data: fils }] = await Promise.all([
    supabase.from('filamento_alertas_stock').select('filamento_id, user_id'),
    supabase.from('filamento_carrito').select('user_id, items').neq('items', '[]'),
    supabase.from('filamentos').select('id, color, material, marca'),
  ])

  const filMap: Record<string, { color: string; material: string; marca: string }> = {}
  for (const f of (fils ?? [])) filMap[f.id] = { color: f.color, material: f.material, marca: f.marca }

  // Juntar todos los user_ids involucrados para resolver nombres de una sola vez
  const allUserIds = new Set<string>()
  for (const a of (alertas ?? [])) allUserIds.add(a.user_id)
  for (const c of (carritos ?? [])) allUserIds.add(c.user_id)

  // Resolver nombres via auth.admin y user_profiles (apodo)
  const userMap: Record<string, { nombre: string; email: string }> = {}
  if (allUserIds.size > 0) {
    const ids = Array.from(allUserIds)
    const [{ data: profiles }, authResults] = await Promise.all([
      supabase.from('user_profiles').select('user_id, apodo').in('user_id', ids),
      Promise.all(ids.map(id => supabase.auth.admin.getUserById(id))),
    ])
    const profileMap: Record<string, string> = {}
    for (const p of (profiles ?? [])) if (p.apodo) profileMap[p.user_id] = p.apodo

    ids.forEach((id, i) => {
      const u = authResults[i]?.data?.user
      const email = u?.email ?? ''
      const metaNombre = u?.user_metadata?.full_name ?? ''
      const apodo = profileMap[id] ?? ''
      userMap[id] = {
        nombre: apodo || metaNombre || email.split('@')[0] || id.slice(0, 8),
        email,
      }
    })
  }

  // Agrupar alertas por filamento_id
  const alertCount: Record<string, number> = {}
  const alertaListas: Record<string, DemandaUsuario[]> = {}
  for (const a of (alertas ?? [])) {
    alertCount[a.filamento_id] = (alertCount[a.filamento_id] ?? 0) + 1
    if (!alertaListas[a.filamento_id]) alertaListas[a.filamento_id] = []
    const u = userMap[a.user_id]
    if (u) alertaListas[a.filamento_id].push({ user_id: a.user_id, ...u })
  }

  // Agrupar carritos por filamento_id
  const carritoRollos: Record<string, number> = {}
  const carritoUsuariosSet: Record<string, Set<string>> = {}
  const carritoListas: Record<string, DemandaUsuario[]> = {}
  for (const cart of (carritos ?? [])) {
    for (const item of (cart.items ?? []) as { filamento_id: string; rollos: number }[]) {
      if (!item.filamento_id) continue
      carritoRollos[item.filamento_id] = (carritoRollos[item.filamento_id] ?? 0) + (item.rollos ?? 0)
      if (!carritoUsuariosSet[item.filamento_id]) carritoUsuariosSet[item.filamento_id] = new Set()
      if (!carritoListas[item.filamento_id]) carritoListas[item.filamento_id] = []
      if (!carritoUsuariosSet[item.filamento_id].has(cart.user_id)) {
        carritoUsuariosSet[item.filamento_id].add(cart.user_id)
        const u = userMap[cart.user_id]
        if (u) carritoListas[item.filamento_id].push({ user_id: cart.user_id, ...u, rollos: item.rollos })
      }
    }
  }

  const allIds = new Set([...Object.keys(alertCount), ...Object.keys(carritoRollos)])
  const result: DemandaFilamento[] = []
  for (const id of allIds) {
    const fil = filMap[id]
    if (!fil) continue
    result.push({
      filamento_id: id,
      color: fil.color,
      material: fil.material,
      marca: fil.marca,
      alertas: alertCount[id] ?? 0,
      carrito_rollos: carritoRollos[id] ?? 0,
      carrito_usuarios: carritoUsuariosSet[id]?.size ?? 0,
      alertas_lista: alertaListas[id] ?? [],
      carrito_lista: carritoListas[id] ?? [],
    })
  }

  return result.sort((a, b) => (b.alertas + b.carrito_rollos) - (a.alertas + a.carrito_rollos))
}

// ── Ocultar/mostrar filamento (admin) ─────────────────────────────────────────

export async function toggleOcultoFilamento(id: string, oculto: boolean): Promise<{ error?: string }> {
  await getAdminUser()
  const supabase = createServiceClient()
  const { error } = await supabase.from('filamentos').update({ oculto }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/filamentos')
  revalidatePath('/filamentos')
  return {}
}

// ── Sugerencias de filamentos (clientes) ─────────────────────────────────────

export async function enviarSugerenciaFilamento(mensaje: string, color?: string): Promise<{ error?: string }> {
  if (!mensaje.trim()) return { error: 'El mensaje no puede estar vacío' }
  if (mensaje.trim().length > 2000) return { error: 'El mensaje es demasiado largo (máx. 2000 caracteres)' }
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Necesitás iniciar sesión para enviar una sugerencia' }

  const sb = createServiceClient()
  const nombre = user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'Cliente'
  const { error } = await sb.from('filamento_sugerencias').insert({
    user_id: user.id,
    nombre_usuario: nombre,
    mensaje: mensaje.trim(),
    color: color?.trim() || null,
  })
  if (error) return { error: 'Error al enviar la sugerencia' }
  revalidatePath('/cuenta')
  return {}
}

export interface FilamentoSugerencia {
  id: string
  user_id: string | null
  nombre_usuario: string
  mensaje: string
  color: string | null
  nota: string | null
  estado: 'pendiente' | 'notificado' | 'descartado'
  respondido_at: string | null
  visto_por_cliente: boolean
  created_at: string
  leido: boolean
}

export async function getSugerenciasAdmin(): Promise<FilamentoSugerencia[]> {
  await getAdminUser()
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('filamento_sugerencias')
    .select('*')
    .order('created_at', { ascending: false })
  return (data ?? []) as FilamentoSugerencia[]
}

export async function marcarSugerenciaLeida(id: string): Promise<void> {
  await getAdminUser()
  const supabase = createServiceClient()
  await supabase.from('filamento_sugerencias').update({ leido: true }).eq('id', id)
}

// Cliente envía un "pedí este color" — formulario estructurado del /cuenta.
// Guarda color y nota en columnas separadas (no parsea mensaje).
export async function pedirColor(data: { color: string; nota?: string }): Promise<{ error?: string }> {
  const color = data.color?.trim()
  if (!color) return { error: 'Indicá qué color te hace falta' }
  if (color.length > 120) return { error: 'El color es demasiado largo' }
  const nota = (data.nota ?? '').trim().slice(0, 500) || null

  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Necesitás iniciar sesión para pedir un color' }

  const sb = createServiceClient()

  // Evitar duplicados: mismo user, mismo color (case-insensitive), pendiente
  const { data: dup } = await sb
    .from('filamento_sugerencias')
    .select('id')
    .eq('user_id', user.id)
    .eq('estado', 'pendiente')
    .ilike('color', color)
    .maybeSingle()
  if (dup) return { error: 'Ya pediste este color — lo tengo anotado' }

  const nombre = user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'Cliente'
  const mensaje = nota ? `Pedido de color: ${color}. ${nota}` : `Pedido de color: ${color}`
  const { error } = await sb.from('filamento_sugerencias').insert({
    user_id: user.id,
    nombre_usuario: nombre,
    mensaje,
    color,
    nota,
  })
  if (error) return { error: 'No se pudo enviar el pedido' }
  revalidatePath('/cuenta')
  revalidatePath('/admin/filamentos')
  return {}
}

// Historial de sugerencias del cliente logueado
export async function getMisSugerencias(): Promise<FilamentoSugerencia[]> {
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const sb = createServiceClient()
  const { data } = await sb
    .from('filamento_sugerencias')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)
  return (data ?? []) as FilamentoSugerencia[]
}

// Cliente borra uno de sus pedidos de color (solo si todavía está pendiente)
export async function borrarMiSugerencia(id: string): Promise<{ error?: string }> {
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }
  const sb = createServiceClient()
  const { error } = await sb
    .from('filamento_sugerencias')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)
  if (error) return { error: 'No se pudo borrar' }
  revalidatePath('/cuenta')
  return {}
}

// Cliente marca como visto el aviso de "ya hay stock" para no mostrar el badge
export async function marcarSugerenciasVistas(): Promise<void> {
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const sb = createServiceClient()
  await sb
    .from('filamento_sugerencias')
    .update({ visto_por_cliente: true })
    .eq('user_id', user.id)
    .eq('estado', 'notificado')
    .eq('visto_por_cliente', false)
}

// Admin notifica al cliente que su color ya está en stock.
// Marca estado=notificado y envía email al cliente.
export async function notificarSugerenciaDisponible(id: string): Promise<{ error?: string; emailEnviado?: boolean }> {
  await getAdminUser()
  const sb = createServiceClient()

  // Primero obtener los datos de la sugerencia para el email
  const { data: sug } = await sb
    .from('filamento_sugerencias')
    .select('user_id, color, mensaje')
    .eq('id', id)
    .maybeSingle()

  const { error } = await sb
    .from('filamento_sugerencias')
    .update({ estado: 'notificado', respondido_at: new Date().toISOString(), leido: true })
    .eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/admin/filamentos')
  revalidatePath('/cuenta')

  // Enviar email al cliente — en background, no fallar si falla
  let emailEnviado = false
  if (sug?.user_id) {
    try {
      const { data: authUser } = await sb.auth.admin.getUserById(sug.user_id)
      const clienteEmail = authUser?.user?.email
      if (clienteEmail) {
        const clienteNombre = authUser.user?.user_metadata?.full_name
          ?? authUser.user?.email?.split('@')[0]
          ?? 'Cliente'
        const color = sug.color || sug.mensaje
        const { sendColorDisponibleCliente } = await import('@/lib/email')
        await sendColorDisponibleCliente({ clienteEmail, clienteNombre, color })
        emailEnviado = true
      }
    } catch (err) {
      console.error('[notificarSugerenciaDisponible] email error:', err)
    }
  }

  return { emailEnviado }
}

export async function descartarSugerencia(id: string): Promise<{ error?: string }> {
  await getAdminUser()
  const sb = createServiceClient()
  const { error } = await sb
    .from('filamento_sugerencias')
    .update({ estado: 'descartado', respondido_at: new Date().toISOString(), leido: true })
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/filamentos')
  revalidatePath('/cuenta')
  return {}
}
