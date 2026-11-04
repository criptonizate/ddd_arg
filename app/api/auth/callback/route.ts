import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAnyAdmin } from '@/lib/admin-roles'

// Valida que `next` sea un path relativo seguro al mismo origen.
// Rechaza: URLs absolutas, protocol-relative (`//evil.tld`), `javascript:`,
// y cualquier cosa que no empiece con una sola `/` seguida de un caracter
// de path válido.
function safeNext(next: string | null): string | null {
  if (!next) return null
  if (!next.startsWith('/')) return null
  if (next.startsWith('//') || next.startsWith('/\\')) return null
  if (next.includes('://')) return null
  // ningún control char
  if (/[\x00-\x1f]/.test(next)) return null
  return next
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = safeNext(searchParams.get('next'))

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      if (next) return NextResponse.redirect(`${origin}${next}`)
      // Si está en la lista de admins → dashboard; si no → /cuenta.
      // Sin fallback "si no hay admins configurados, todos son admin".
      const isAdmin = isAnyAdmin(data.user.email)
      return NextResponse.redirect(`${origin}${isAdmin ? '/admin/dashboard' : '/cuenta'}`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=auth_error`)
}
