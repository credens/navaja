import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Navaja',
  description: 'La turnera con filo. Sistema de turnos para barberías.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
