import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Kalori.AI — Hitung kalori dari foto',
  description: 'Analisis kalori makanan dari foto menggunakan AI. Pantau asupan harian, protein, dan progress diet kamu.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  )
}
