import { defineConfig, devices } from '@playwright/test'

// Playwright config para los tests E2E nocturnos contra producción.
// Pensado para correr en GitHub Actions (cron) sobre https://ddd-arg.vercel.app
// — los tests son SOLO de lectura: NO crean pedidos reales, NO suben fotos,
// NO modifican la DB.
//
// Overrides útiles:
//   BASE_URL=http://localhost:3000 npx playwright test   # correr contra local
//   npx playwright test --ui                             # modo visual local
//   npx playwright test tests/e2e/home.spec.ts           # un solo archivo

const BASE_URL = process.env.BASE_URL ?? 'https://ddd-arg.vercel.app'

export default defineConfig({
  testDir: './tests/e2e',
  // Ejecutamos secuencialmente por defecto para no estresar al servidor real.
  fullyParallel: false,
  workers: process.env.CI ? 2 : 4,
  retries: process.env.CI ? 2 : 0,   // red flakey en CI, nos tapa el sombrero
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }], ['list']]
    : [['html', { open: 'on-failure' }], ['list']],
  timeout: 45_000,                    // tests de UI; si pasa de 45s algo está mal
  expect: { timeout: 10_000 },

  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // User-Agent explícito para que si prod hace analytics podamos filtrarlos.
    userAgent: 'DDD-ARG-QA-Playwright/1.0 (+https://github.com/criptonizate/ddd_arg)',
    viewport: { width: 1280, height: 720 },
    locale: 'es-AR',
    timezoneId: 'America/Argentina/Buenos_Aires',
    // No persistimos cookies entre tests para que arranquen limpios.
    storageState: undefined,
  },

  // Cubrimos los 3 viewports que el usuario pidió: web, tablet, celular.
  // Todos corren sobre Chromium para que solo haga falta instalar un browser
  // (en CI y en local). El tablet usa Chromium con viewport de iPad en vez
  // del device nativo (que forzaría WebKit).
  projects: [
    {
      name: 'desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      name: 'tablet',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 820, height: 1180 },        // iPad Air portrait
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: 'mobile',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 393, height: 852 },         // Pixel 7
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
})
