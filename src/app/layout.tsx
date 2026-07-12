import type { Metadata, Viewport } from 'next'
import './globals.css'
import { ServiceWorkerRegistrar } from '@/components/service-worker-registrar'
import { Analytics } from '@vercel/analytics/react'

export const metadata: Metadata = {
  title: 'SIC Global Minds',
  description: 'Sistema de Inteligencia Comercial — Marca Digital x Global Minds Consultoria',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'SIC Global Minds',
  },
}

export const viewport: Viewport = {
  themeColor: '#D4506A',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-AO">
      <body className="font-body antialiased">
        {children}
        <ServiceWorkerRegistrar />
        <Analytics />
      </body>
    </html>
  )
}
