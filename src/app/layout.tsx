import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Navbar } from '@/components/layout/Navbar'
import { Toaster } from '@/components/ui/sonner'
import { Providers } from './providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'MCPS Markets',
  description: 'Prediction markets for MCPS students',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased bg-background text-foreground`}>
        <Providers>
          <Navbar />
          <main className="max-w-5xl mx-auto px-4 py-8">
            {children}
          </main>
          <Toaster />
        </Providers>
      </body>
    </html>
  )
}
