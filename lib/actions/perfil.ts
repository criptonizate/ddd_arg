'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/server'

export interface UserProfile {
  telefono: string | null
  dni: string | null
  sexo: 'M' | 'F' | 'otro' | null
}

export async function getMyProfile(): Promise<UserProfile | null> {
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const db = createServiceClient()
  const { data } = await db
    .from('user_profiles')
    .select('telefono, dni, sexo')
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
      updated_at: new Date().toISOString(),
    })

  if (error) return { error: error.message }
  revalidatePath('/cuenta')
  return {}
}
