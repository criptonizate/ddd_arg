import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'DDD ARG — Impresión 3D',
    short_name: 'DDD ARG',
    description: 'Filamentos, productos 3D y pedidos personalizados. Argentina.',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0a0a0a',
    theme_color: '#16a34a',
    lang: 'es-AR',
    categories: ['shopping', 'business'],
    icons: [
      {
        src: '/LogoDDDARG.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/LogoDDDARG.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/LogoDDDARG.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      {
        name: 'Filamentos',
        short_name: 'Filamentos',
        description: 'Ver catálogo de filamentos',
        url: '/filamentos',
      },
      {
        name: 'Mi cuenta',
        short_name: 'Cuenta',
        description: 'Pedidos, membresía y DDD Coins',
        url: '/cuenta',
      },
    ],
  }
}
