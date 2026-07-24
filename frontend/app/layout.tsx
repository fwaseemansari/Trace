import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono, Inter } from 'next/font/google'
import { AuthProvider } from '@/hooks/useAuth'
import { AuroraBackground } from '@/components/shared/AuroraBackground'
import './globals.css'

const geistSans = Geist({
  subsets: ['latin'],
  variable: '--font-geist-sans',
})

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'Zen — Chat with your documents intelligently',
  description:
    'Zen is a Retrieval Augmented Generation workspace. Upload any document and get grounded answers with source citations.',
  generator: 'v0.app',
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#210635',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${inter.variable}`}>
      <body className="antialiased relative min-h-screen bg-[#210635] text-[#f5d5e0]">
        {/* Aurora background on every single page */}
        <AuroraBackground />
        <div className="relative z-10 min-h-screen flex flex-col">
          <AuthProvider>{children}</AuthProvider>
        </div>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
