import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Rutas que requieren autenticación admin
  const isAdminRoute = pathname.startsWith('/admin')
  // La ruta de login no necesita protección
  const isAuthRoute = pathname.startsWith('/auth')

  // Crear respuesta mutable para poder escribir cookies de Supabase
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refrescar sesión si existe (mantiene tokens frescos)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (isAdminRoute) {
    // Sin sesión → redirect a login
    if (!user) {
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }
    // Con sesión pero email incorrecto → redirect a login con error
    const adminEmail = process.env.ADMIN_EMAIL
    if (adminEmail && user.email !== adminEmail) {
      await supabase.auth.signOut()
      return NextResponse.redirect(
        new URL('/auth/login?error=unauthorized', request.url)
      )
    }
  }

  // Si ya está autenticado como admin y visita login → redirect al dashboard
  if (isAuthRoute && user) {
    const adminEmail = process.env.ADMIN_EMAIL
    if (!adminEmail || user.email === adminEmail) {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
