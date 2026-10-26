'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function signInWithGoogle() {
  const supabase = await createClient()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${siteUrl}/api/auth/callback` },
  })

  if (error) redirect('/auth/login?error=auth_error')
  if (data.url) redirect(data.url)
}

export async function signInWithGoogleCliente() {
  const supabase = await createClient()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${siteUrl}/api/auth/callback?next=/cuenta` },
  })

  if (error) redirect('/?error=auth_error')
  if (data.url) redirect(data.url)
}

export async function signInWithGoogleAndReturn(next: string) {
  const supabase = await createClient()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  const safePath = next.startsWith('/') ? next : '/cuenta'
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${siteUrl}/api/auth/callback?next=${encodeURIComponent(safePath)}` },
  })

  if (error) redirect('/?error=auth_error')
  if (data.url) redirect(data.url)
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/auth/login')
}

export async function signOutCliente() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/')
}

export async function getAdminUser() {
  if (!process.env.ADMIN_EMAIL) {
    throw new Error('ADMIN_EMAIL no está configurado')
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('No autenticado')

  const adminEmails = process.env.ADMIN_EMAIL.split(',').map((e) => e.trim()).filter(Boolean)
  if (!adminEmails.includes(user.email ?? '')) throw new Error('Acceso denegado')

  return user
}
