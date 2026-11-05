import { test, expect } from '@playwright/test'

// Home page: botones, cartel verde "Precios Mayoristas" lleva a /filamentos,
// trust bar visible, sección "¿Cómo comprás?" presente.

test.describe('Home', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
  })

  test('hero: título y botón "Ver filamentos" visibles', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /lo que imaginás/i })).toBeVisible()
    const cta = page.getByRole('link', { name: /ver filamentos/i }).first()
    await expect(cta).toBeVisible()
  })

  test('botón "Consultar por WhatsApp" NO debe existir en el hero', async ({ page }) => {
    // Lo quitamos por pedido. Si vuelve a aparecer, es regresión.
    const whatsappCta = page.locator('a:has-text("Consultar por WhatsApp")')
    await expect(whatsappCta).toHaveCount(0)
  })

  test('cartel "Precios Mayoristas" es clicable y lleva a /filamentos', async ({ page }) => {
    const cartel = page.getByRole('link', { name: /precios mayoristas/i })
    await expect(cartel).toBeVisible()
    await cartel.click()
    await page.waitForURL('**/filamentos', { timeout: 10_000 })
    expect(page.url()).toContain('/filamentos')
  })

  test('sección "Stock disponible" (grid de 18 colores) NO debe existir', async ({ page }) => {
    // La ocultamos por pedido. Si aparece el label, es regresión.
    const stockLabel = page.locator('text=Stock disponible')
    await expect(stockLabel).toHaveCount(0)
  })

  test('bloque "¿Tenés una idea? Hablemos." NO debe existir', async ({ page }) => {
    const ideaBlock = page.locator('text=/tenés una idea/i')
    await expect(ideaBlock).toHaveCount(0)
  })

  test('trust bar: 4 items visibles', async ({ page }) => {
    for (const texto of ['Envío', 'Retiro', 'Atención', 'colores']) {
      await expect(page.locator(`text=/${texto}/i`).first()).toBeVisible()
    }
  })

  test('"¿Cómo comprás?" muestra 3 pasos', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /cómo comprás/i })).toBeVisible()
    for (const paso of ['Elegí tu filamento', 'Registrá tu pedido', 'Coordinamos']) {
      await expect(page.locator(`text=/${paso}/i`).first()).toBeVisible()
    }
  })
})
