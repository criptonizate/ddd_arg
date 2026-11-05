import { test, expect } from '@playwright/test'

// Flujo de catálogo: entrar a /filamentos, verificar que el grid carga, abrir
// un grupo, agregar un color al carrito, abrir el drawer, iniciar checkout.
// NO llegamos a confirmar el pedido para no ensuciar la DB en prod.

test.describe('Filamentos', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/filamentos', { waitUntil: 'domcontentloaded' })
  })

  test('grid carga con al menos una card', async ({ page }) => {
    // El sort default es "destacados" — debería haber al menos una card
    // visible al cargar (si no hay filamentos en prod este test falla
    // justificadamente). El buscador vive en el sidebar que se oculta en
    // mobile tras un botón de filtros; no lo chequeamos acá.
    const cards = page.locator('[aria-label^="Ver colores de"]')
    await expect(cards.first()).toBeVisible({ timeout: 15_000 })
    const buscador = page.getByPlaceholder(/buscar por color/i).first()
    await expect(buscador).toBeAttached()  // existe en el DOM aunque esté oculto en mobile
  })

  test('abrir un grupo muestra el modal con colores', async ({ page }) => {
    const primerGrupo = page.locator('[aria-label^="Ver colores de"]').first()
    await primerGrupo.click()
    const dialogo = page.getByRole('dialog')
    await expect(dialogo).toBeVisible()
    // Debería haber al menos un botón "Agregar" dentro del modal
    const agregar = dialogo.getByRole('button', { name: /^agregar$/i }).first()
    await expect(agregar).toBeVisible({ timeout: 5_000 })
  })

  test('agregar 1 kg abre el FAB "Pagar ·"', async ({ page }) => {
    // Esperamos a que el grid cargue completamente.
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})

    // Intentamos agregar desde los swatches de la primera card con stock (1 tap).
    // Si no hay swatch disponible (todas sin stock), saltamos este test.
    const swatches = page.locator('button[aria-label^="Agregar 1 kg de"]')
    const total = await swatches.count()
    test.skip(total === 0, 'no hay swatches con stock disponible')

    await swatches.first().click()

    // El toast "✓ Agregado:" debería aparecer; buscamos su contenido.
    await expect(page.locator('text=/✓.*Agregado|✓.*kg/i').first()).toBeVisible({ timeout: 4_000 })

    // El FAB debería aparecer con "Pagar ·"
    const fab = page.getByRole('button', { name: /ver carrito y pagar|pagar.*kg|abrir carrito/i })
    await expect(fab.first()).toBeVisible({ timeout: 3_000 })
  })
})
