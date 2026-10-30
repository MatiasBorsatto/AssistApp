import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ASISTAPP | Gestión institucional',
  description: 'Sistema de gestión y control de asistencia para instituciones educativas.',
  icons: { icon: [{ url: '/logo.svg', type: 'image/svg+xml' }], shortcut: '/logo.svg', apple: '/logo.svg' },
}
export const viewport: Viewport = { colorScheme: 'light', themeColor: '#d98a0b', userScalable: true }
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body className="antialiased">{children}</body></html>
}
