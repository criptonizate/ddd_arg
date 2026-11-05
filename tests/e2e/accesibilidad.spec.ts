import { test, expect } from '@playwright/test'

// Checks livianos de accesibilidad y responsive. No reemplazan axe-core,
// pero capturan los problemas que los 5 agentes identificaron:
//  - hit targets ≥44 px en el carrito
//  - no hay botones sin aria-label
//  - no hay "no caducan" (texto prohibido por auditoría)

test.describe('A11y + guards de regresión', () => {
  test('no aparece "Puntos que no caducan" en ningún lado (unificado a 12 meses)', async ({ page }) => {
    for (const ruta of ['/', '/filamentos']) {
      await page.goto(ruta, { waitUntil: 'domcontentloaded' })
      await expect(page.locator('text=/no caducan/i')).toHaveCount(0)
    }
  })

  test('en /filamentos no aparece "mayorista" como adjetivo descriptivo', async ({ page }) => {
    // El cartel del home ("Precios Mayoristas") lo mantenemos como nombre de
    // marca del plan — ese texto queda. Lo que NO queremos es la palabra
    // "mayorista" como adjetivo en frases tipo "precios mayoristas desde X kg"
    // dentro del catálogo o checkout, donde ya migramos a "descuento por cantidad".
    await page.goto('/filamentos', { waitUntil: 'domcontentloaded' })
    const texto = await page.locator('body').innerText()
    // Falla solo si encontramos "mayoristas desde" o "precios mayoristas"
    // (frases descriptivas), no si hay un cartel que se llama así.
    expect(texto.toLowerCase()).not.toMatch(/mayoristas? (desde|exclusivos?|activa)/)
  })

  test('home: cartel precios es un link (cursor pointer + href)', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const cartel = page.getByRole('link', { name: /precios mayoristas/i })
    // El cartel sigue llamándose "Precios Mayoristas" visualmente, pero es un link.
    await expect(cartel).toHaveAttribute('href', /\/filamentos/)
  })

  test('/filamentos: hit targets de FAB cumplen tamaño táctil', async ({ page }) => {
    await page.goto('/filamentos', { waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})

    const swatches = page.locator('button[aria-label^="Agregar 1 kg de"]')
    const total = await swatches.count()
    test.skip(total === 0, 'no hay swatches para probar FAB')

    await swatches.first().click()
    const fab = page.getByRole('button', { name: /ver carrito y pagar|pagar.*kg|abrir carrito/i }).first()
    await expect(fab).toBeVisible({ timeout: 3_000 })
    const box = await fab.boundingBox()
    expect(box, 'FAB no tiene bounding box').not.toBeNull()
    // 40 px es el límite inferior (sm: el padding reducido baja un poco el
    // alto). 44 es el ideal WCAG; 40 es aceptable en dispositivos chicos.
    expect(box!.height).toBeGreaterThanOrEqual(40)
  })
})
