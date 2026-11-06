# QA automatizado — DDD ARG

Tests E2E con [Playwright](https://playwright.dev/) que corren contra
producción (`https://dddarg.com.ar`) todas las noches a las **00:00 de
Argentina** (03:00 UTC) y notifican si algo se rompió.

Los tests son **solo de lectura**: no crean pedidos reales, no suben fotos
ni modifican la DB.

## Correrlos localmente

```bash
# Contra producción (lo mismo que corre el cron)
npm run test:e2e

# Contra una instancia local (necesitás `npm run dev` corriendo en paralelo)
npm run test:e2e:local

# Modo UI visual, útil para depurar
npm run test:e2e:ui

# Solo un proyecto (desktop | tablet | mobile)
npm run test:e2e:desktop
npm run test:e2e:mobile

# Ver el reporte de la última corrida
npm run test:e2e:report
```

## Qué cubre

| Archivo | Flujo |
| --- | --- |
| `smoke.spec.ts` | `/`, `/filamentos`, `/privacidad`, `/insumos` cargan sin 500 ni pageerror. `/cuenta` sin sesión redirige. |
| `home.spec.ts` | Hero, cartel verde "Precios Mayoristas" lleva a `/filamentos`, guards de regresión: NO existe "Consultar por WhatsApp", NO existe "Stock disponible", NO existe "¿Tenés una idea?". |
| `filamentos.spec.ts` | Grid carga, buscador visible, modal del grupo abre, agregar 1 kg desde swatch muestra toast y FAB. |
| `checkout.spec.ts` | Agregar kg → abrir carrito → "Pedir ahora" → form con nombre + teléfono + horarios reales. **No confirma el pedido** (deliberado). |
| `accesibilidad.spec.ts` | Guards de regresión: ni "no caducan" ni "mayorista" en la vista pública; FAB cumple hit-target de 44 px. |

Cada test corre en 3 viewports: `desktop` (1280×720), `tablet` (iPad gen 7),
`mobile` (Pixel 7).

## Cron nocturno en GitHub Actions

El workflow está en `.github/workflows/qa-nocturno.yml`:

- Se dispara automáticamente a las **03:00 UTC** cada día.
- También se puede correr manualmente: *Actions → QA nocturno → Run workflow*.
  Permite pasar una `base_url` distinta (ej. el preview de un PR).
- Si algún test falla, el workflow sube los traces y screenshots como
  artefactos descargables (14 días) + videos (7 días).

## Cómo agregar un test nuevo

1. Creá un archivo `tests/e2e/<nombre>.spec.ts`.
2. Importá `import { test, expect } from '@playwright/test'`.
3. No llames a server actions que creen / modifiquen datos reales. Si necesitás
   datos de usuario logueado, configurá un `storageState` con una cuenta de
   test dedicada (todavía no lo tenemos — hacerlo cuando sume valor).
4. Corré `npm run test:e2e:ui` para iterarlo en modo visual.

## Guardar una cuenta de test logueada

Pendiente. Cuando hagamos el flujo autenticado:

```bash
# 1. Login manual con una cuenta de test
npx playwright codegen https://dddarg.com.ar --save-storage=tests/e2e/.auth/cliente.json

# 2. Referenciarlo desde un test
# test.use({ storageState: 'tests/e2e/.auth/cliente.json' })
```
