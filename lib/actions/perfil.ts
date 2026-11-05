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
  avatar_url?: string | null
}

export async function getMyProfile(): Promise<UserProfile | null> {
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const db = createServiceClient()
  const { data } = await db
    .from('user_profiles')
    .select('numero_cliente, telefono, dni, sexo, apodo, avatar_url')
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

// ── Avatar custom (sube al bucket `avatars` y guarda la URL en el perfil) ───

const AVATAR_MAX_BYTES = 3 * 1024 * 1024    // 3 MB
const AVATAR_ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

export async function uploadMyAvatar(formData: FormData): Promise<{ url?: string; error?: string }> {
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const file = formData.get('file')
  if (!(file instanceof File)) return { error: 'Archivo faltante' }
  if (file.size > AVATAR_MAX_BYTES) return { error: 'La imagen supera los 3 MB' }
  if (!AVATAR_ALLOWED_MIME.has(file.type)) return { error: 'Formato no soportado (usá JPG, PNG, WebP o GIF)' }

  const db = createServiceClient()

  // Limpiamos avatares viejos del usuario — así el bucket no se infla.
  const { data: oldList } = await db.storage.from('avatars').list(user.id, { limit: 100 })
  if (oldList?.length) {
    const paths = oldList.map((o: { name: string }) => `${user.id}/${o.name}`)
    await db.storage.from('avatars').remove(paths).catch(() => { /* noop */ })
  }

  const ext = file.type === 'image/png' ? 'png'
    : file.type === 'image/webp' ? 'webp'
    : file.type === 'image/gif'  ? 'gif'
    : 'jpg'
  const path = `${user.id}/${Date.now()}.${ext}`
  const buf = Buffer.from(await file.arrayBuffer())
  const { error: upErr } = await db.storage.from('avatars').upload(path, buf, {
    contentType: file.type,
    upsert: true,
  })
  if (upErr) return { error: upErr.message }

  const { data: { publicUrl } } = db.storage.from('avatars').getPublicUrl(path)
  // Cache-bust: el path ya es único por timestamp, pero algunos proxies tienden
  // a cachear /avatars/{id}/... → agregamos ?v=<ts> para forzar refetch.
  const urlWithVersion = `${publicUrl}?v=${Date.now()}`

  const { error: profErr } = await db
    .from('user_profiles')
    .upsert({ user_id: user.id, avatar_url: urlWithVersion, updated_at: new Date().toISOString() })
  if (profErr) return { error: profErr.message }

  revalidatePath('/cuenta')
  return { url: urlWithVersion }
}

export async function removeMyAvatar(): Promise<{ error?: string }> {
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const db = createServiceClient()
  const { data: list } = await db.storage.from('avatars').list(user.id, { limit: 100 })
  if (list?.length) {
    const paths = list.map((o: { name: string }) => `${user.id}/${o.name}`)
    await db.storage.from('avatars').remove(paths).catch(() => { /* noop */ })
  }
  await db.from('user_profiles').upsert({
    user_id: user.id, avatar_url: null, updated_at: new Date().toISOString(),
  })
  revalidatePath('/cuenta')
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
