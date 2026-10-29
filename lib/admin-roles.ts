// Roles de admin — fuente única de verdad para permisos del panel.
//
// FULL admin: emails en env var ADMIN_EMAIL (coma-separado). Ven todo.
// LIMITED admin: emails en el map LIMITED_ADMINS, con la lista de rutas
// permitidas. Solo ven lo que esté en su lista.

export const LIMITED_ADMINS: Record<string, string[]> = {
  'paulamegias24@gmail.com': [
    '/admin/presupuesto',
    '/admin/filamentos',
    '/admin/cuentas',
  ],
}

export function getFullAdminEmails(): string[] {
  return (process.env.ADMIN_EMAIL ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}

export function isFullAdmin(email: string | null | undefined): boolean {
  if (!email) return false
  const list = getFullAdminEmails()
  return list.length > 0 && list.includes(email.toLowerCase())
}

export function isLimitedAdmin(email: string | null | undefined): boolean {
  if (!email) return false
  return email.toLowerCase() in LIMITED_ADMINS
}

export function isAnyAdmin(email: string | null | undefined): boolean {
  return isFullAdmin(email) || isLimitedAdmin(email)
}

// 'all' = full admin, puede todo. Array = limited admin con esas rutas.
export function getAllowedAdminRoutes(
  email: string | null | undefined,
): 'all' | string[] {
  if (!email) return []
  if (isFullAdmin(email)) return 'all'
  return LIMITED_ADMINS[email.toLowerCase()] ?? []
}

export function canAccessAdminRoute(
  email: string | null | undefined,
  pathname: string,
): boolean {
  const allowed = getAllowedAdminRoutes(email)
  if (allowed === 'all') return true
  return allowed.some((r) => pathname === r || pathname.startsWith(r + '/'))
}

// Ruta por defecto al loguearse — full admin va al dashboard,
// limited admin va a la primera ruta que tenga permitida.
export function defaultAdminRoute(email: string | null | undefined): string {
  const allowed = getAllowedAdminRoutes(email)
  if (allowed === 'all') return '/admin/dashboard'
  return allowed[0] ?? '/auth/login'
}
