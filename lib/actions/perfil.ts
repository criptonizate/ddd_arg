'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/server'
import { getAdminUser } from './auth'

export interface UserProfile {
  numero_cliente: number | null
  telefono: string | null
  dni: string | null
  sexo: 'M' | 'F' | 'otro' | null
  apodo: string | null
}

export async function getMyProfile(): Promise<UserProfile | null> {
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const db = createServiceClient()
  const { data } = await db
    .from('user_profiles')
    .select('numero_cliente, telefono, dni, sexo, apodo')
    .eq('user_id', user.id)
    .single()

  return (data ?? null) as UserProfile | null
}

export async function saveMyProfile(profile: UserProfile): Promise<{ error?: string }> {
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const db = createServiceClient()
  const { error } = await db
    .from('user_profiles')
    .upsert({
      user_id: user.id,
      telefono: profile.telefono?.trim() || null,
      dni: profile.dni?.trim() || null,
      sexo: profile.sexo || null,
      apodo: profile.apodo?.trim() || null,
      updated_at: new Date().toISOString(),
    })

  if (error) return { error: error.message }
  revalidatePath('/cuenta')

  // Sumar puntos si el perfil tiene al menos un dato completado
  const tienesDatos = profile.telefono || profile.dni || profile.apodo
  if (tienesDatos) {
    const { sumarPuntosPerfilCompleto } = await import('./ddd-coins')
    void sumarPuntosPerfilCompleto(user.id)
  }

  return {}
}

// ── Admin: mapa de apodos para todos los usuarios ────────────────────────────

export async function getAdminApodoMap(): Promise<Record<string, string>> {
  await getAdminUser()
  const db = createServiceClient()
  const { data } = await db
    .from('user_profiles')
    .select('user_id, admin_apodo')
    .not('admin_apodo', 'is', null)
  const map: Record<string, string> = {}
  for (const row of data ?? []) {
    if (row.admin_apodo) map[row.user_id] = row.admin_apodo
  }
  return map
}

// ── Admin: notas privadas por usuario ────────────────────────────────────────

export interface AdminUserNotes {
  admin_telefono: string | null
  admin_apodo: string | null
}

export async function getAdminUserNotes(userId: string): Promise<AdminUserNotes> {
  await getAdminUser()
  const db = createServiceClient()
  const { data } = await db
    .from('user_profiles')
    .select('admin_telefono, admin_apodo')
    .eq('user_id', userId)
    .single()
  return { admin_telefono: data?.admin_telefono ?? null, admin_apodo: data?.admin_apodo ?? null }
}

export async function saveAdminUserNotes(userId: string, notes: AdminUserNotes): Promise<{ error?: string }> {
  await getAdminUser()
  const db = createServiceClient()
  const { error } = await db
    .from('user_profiles')
    .upsert({
      user_id: userId,
      admin_telefono: notes.admin_telefono?.trim() || null,
      admin_apodo: notes.admin_apodo?.trim() || null,
      updated_at: new Date().toISOString(),
    })
  if (error) return { error: error.message }
  return {}
}
