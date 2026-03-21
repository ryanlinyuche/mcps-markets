import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Navbar } from '@/components/layout/Navbar'
import { RulesGate } from '@/components/layout/RulesGate'
import { Toaster } from '@/components/ui/sonner'
import { Providers } from './providers'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'MCPS Markets',
  description: 'Prediction markets for MCPS students',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()
  let needsRules = false
  if (session) {
    const res = await db.execute({
      sql: 'SELECT rules_accepted_at FROM users WHERE id = ?',
      args: [Number(session.sub)],
    })
    const user = res.rows[0] as unknown as { rules_accepted_at: string | null } | undefined
    needsRules = !user?.rules_accepted_at
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            try {
              var t = localStorage.getItem('theme');
              if (t === 'dark') document.documentElement.classList.add('dark');
            } catch(e) {}
          })();
        `}} />
      </head>
      <body className={`${inter.className} antialiased bg-background text-foreground`}>
        <Providers>
          <Navbar />
          {needsRules && <RulesGate />}
          <main className="max-w-7xl mx-auto px-4 py-8">
            {children}
          </main>
          <Toaster />
        </Providers>
      </body>
    </html>
  )
}
