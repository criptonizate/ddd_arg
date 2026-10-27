import type { Metadata, Viewport } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import RegisterSW from '@/components/store/RegisterSW'

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist-sans',
})

export const metadata: Metadata = {
  title: {
    default: 'DDD ARG — Impresión 3D',
    template: '%s | DDD ARG',
  },
  description:
    'Productos únicos impresos en 3D. Diseños originales, calidad premium. Argentina.',
  keywords: ['impresión 3D', 'productos 3D', 'Argentina', 'DDD ARG'],
  applicationName: 'DDD ARG',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'DDD ARG',
  },
  openGraph: {
    title: 'DDD ARG — Impresión 3D',
    description: 'Productos únicos impresos en 3D. Argentina.',
    type: 'website',
    locale: 'es_AR',
    siteName: 'DDD ARG',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DDD ARG — Impresión 3D',
  },
  icons: {
    icon: '/LogoDDDARG.png',
    apple: '/LogoDDDARG.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#16a34a' },
    { media: '(prefers-color-scheme: dark)',  color: '#0a0a0a' },
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className={`${geist.variable} h-full`}>
      <body className="min-h-full flex flex-col antialiased bg-background text-foreground">
        {children}
        <RegisterSW />
      </body>
    </html>
  )
}
