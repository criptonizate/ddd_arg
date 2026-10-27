// Service worker mínimo: habilita instalación PWA en iOS/Android
// y provee cache básico de assets estáticos para navegación offline rápida.

const CACHE_NAME = 'ddd-arg-v1'
const STATIC_ASSETS = ['/', '/LogoDDDARG.png']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)).catch(() => {})
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  // Solo cacheamos GET para assets del mismo origen
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  // No cachear API, auth ni server actions
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/auth')) return

  // Network-first para HTML (siempre fresco), cache-first para estáticos
  const isHTML = request.headers.get('accept')?.includes('text/html')
  if (isHTML) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE_NAME).then((c) => c.put(request, copy)).catch(() => {})
          return res
        })
        .catch(() => caches.match(request).then((r) => r ?? caches.match('/')))
    )
    return
  }
  // Para estáticos: cache-first con revalidación en background
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request).then((res) => {
        const copy = res.clone()
        caches.open(CACHE_NAME).then((c) => c.put(request, copy)).catch(() => {})
        return res
      }).catch(() => cached)
      return cached ?? fetchPromise
    })
  )
})
