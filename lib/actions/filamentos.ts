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

export async function registrarVentaFilamento(
  filamentoId: string,
  venta: { gramos: number; precio_kg: number; costo_kg: number; cliente: string; nota: string; fecha: string }
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
