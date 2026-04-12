import type { Metadata, Viewport } from 'next'
import { Playfair_Display, Montserrat } from 'next/font/google'
import './globals.css'

const playfairDisplay = Playfair_Display({
  variable: '--font-heading',
  subsets: ['latin'],
  display: 'swap',
})

const montserrat = Montserrat({
  variable: '--font-body',
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Delicias da Isi — CRM',
  description: 'Sistema inteligente de gestao para confeitaria artesanal angolana',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Delicias da Isi',
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
      <body
        className={`${playfairDisplay.variable} ${montserrat.variable} font-body antialiased`}
      >
        {children}
      </body>
    </html>
  )
}
