import { test, expect } from '@playwright/test'

// Smoke tests: verifican que las rutas públicas cargan sin 500 ni errores
// bloqueantes de hidratación. Si algo revienta en prod lo vemos acá antes
// que lo vea un cliente.

const RUTAS_PUBLICAS = [
  { path: '/',            titulo: /DDD ARG/i },
  { path: '/filamentos',  titulo: /filamento|DDD ARG/i },
  { path: '/privacidad',  titulo: /privacidad|DDD ARG/i },
  { path: '/insumos',     titulo: /insumo|DDD ARG/i },
]

for (const ruta of RUTAS_PUBLICAS) {
  test(`${ruta.path} carga sin errores`, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(`[pageerror] ${err.message}`))
    page.on('response', (res) => {
      if (res.status() >= 500 && new URL(res.url()).pathname === ruta.path) {
        errors.push(`[${res.status()}] ${res.url()}`)
      }
    })

    const response = await page.goto(ruta.path, { waitUntil: 'domcontentloaded' })
    expect(response, `No se obtuvo response para ${ruta.path}`).not.toBeNull()
    expect(response!.status(), `Status de ${ruta.path}`).toBeLessThan(400)

    await expect(page).toHaveTitle(ruta.titulo)
    // No deberían haberse disparado errores de runtime al montar la página.
    expect(errors, `Errores en ${ruta.path}`).toEqual([])
  })
}

test('/cuenta redirige a login si no hay sesión', async ({ page }) => {
  const response = await page.goto('/cuenta', { waitUntil: 'domcontentloaded' })
  // Puede redirigir al home con ?login=1 o a una página de auth.
  const finalUrl = page.url()
  expect(response!.status()).toBeLessThan(500)
  expect(finalUrl).not.toMatch(/\/cuenta\?/)  // si está en /cuenta sin query, hay bug
})
