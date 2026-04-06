import type { Metadata } from 'next'
import './globals.css'
import PWAInstall from '@/components/PWAInstall'

export const metadata: Metadata = {
  title: 'Kalori.AI — Hitung kalori dari foto',
  description: 'Analisis kalori makanan dari foto menggunakan AI. Pantau asupan harian, protein, dan progress diet kamu.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#3d9e50" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Kalori.AI" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body>
        {children}
        <PWAInstall />
      </body>
    </html>
  )
}
