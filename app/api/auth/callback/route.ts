import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? ''

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      const adminEmails = (process.env.ADMIN_EMAIL ?? '').split(',').map((e) => e.trim()).filter(Boolean)
      const isAdmin = adminEmails.length === 0 || adminEmails.includes(data.user.email ?? '')

      if (next) return NextResponse.redirect(`${origin}${next}`)
      return NextResponse.redirect(`${origin}${isAdmin ? '/admin/dashboard' : '/cuenta'}`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=auth_error`)
}
