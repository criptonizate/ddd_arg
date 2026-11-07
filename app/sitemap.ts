import type { MetadataRoute } from 'next'
import { getActiveProducts } from '@/lib/actions/products'

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://dddarg.com.ar').replace(/\/$/, '')

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  const rutasEstaticas: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/filamentos`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/insumos`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE_URL}/privacidad`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ]

  let productos: MetadataRoute.Sitemap = []
  try {
    const items = await getActiveProducts()
    productos = items.map((p) => ({
      url: `${SITE_URL}/producto/${p.id}`,
      lastModified: new Date(p.created_at ?? now),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }))
  } catch (err) {
    console.warn('[sitemap] no pudo leer productos:', err)
  }

  return [...rutasEstaticas, ...productos]
}
