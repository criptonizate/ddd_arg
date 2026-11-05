import { test, expect } from '@playwright/test'

// Checkout invitado: validamos la UI hasta el step 'form', pero NO llamamos
// a "Pedir ahora" para no crear pedidos reales. Si alguna vez querés hacer
// este test completo, hacelo contra un env de test con env BASE_URL propia.

test('checkout invitado muestra form con nombre + teléfono + aviso', async ({ page }) => {
  await page.goto('/filamentos', { waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})

  // Agregar 1 kg desde el primer swatch disponible.
  const swatches = page.locator('button[aria-label^="Agregar 1 kg de"]')
  const total = await swatches.count()
  test.skip(total === 0, 'no hay swatches con stock para el checkout test')
  await swatches.first().click()

  // Abrir el carrito con el FAB.
  const fab = page.getByRole('button', { name: /ver carrito y pagar|pagar.*kg|abrir carrito/i }).first()
  await fab.click()

  // En el drawer, el botón "Pedir ahora →" debe estar visible.
  const pedirAhora = page.getByRole('button', { name: /pedir ahora/i })
  await expect(pedirAhora).toBeVisible({ timeout: 5_000 })
  await pedirAhora.click()

  // Modal de checkout: form con nombre + teléfono.
  await expect(page.getByLabel(/tu nombre/i)).toBeVisible({ timeout: 5_000 })
  await expect(page.getByLabel(/teléfono/i)).toBeVisible()

  // El detalle "¿Cómo lo recibo?" está colapsado tras <details>. Lo
  // expandimos y validamos que menciona "WhatsApp" (prueba mínima: no
  // acoplamos al texto exacto para que un cambio de horarios no rompa).
  const summary = page.locator('summary', { hasText: /cómo lo recibo/i })
  if (await summary.isVisible().catch(() => false)) {
    await summary.click()
    await expect(page.locator('text=/WhatsApp/i').first()).toBeVisible({ timeout: 5_000 })
  }

  // NO confirmamos el pedido: cerramos y salimos.
  const cerrar = page.getByRole('button', { name: /cerrar checkout/i })
  if (await cerrar.isVisible().catch(() => false)) await cerrar.click()
})
