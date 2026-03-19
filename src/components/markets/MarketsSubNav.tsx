'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { PlusCircle } from 'lucide-react'

interface Props {
  isLoggedIn: boolean
}

export function MarketsSubNav({ isLoggedIn }: Props) {
  const pathname = usePathname()

  const links = [
    ...(isLoggedIn ? [{ href: '/markets/yours', label: 'Your Markets' }] : []),
    { href: '/markets/ongoing', label: 'Ongoing' },
    { href: '/markets/closed', label: 'Closed' },
    { href: '/markets/resolved', label: 'Resolved' },
  ]

  return (
    <div className="border-b bg-background">
      <div className="max-w-5xl mx-auto px-4 flex items-center justify-between h-10">
        <div className="flex items-center gap-1 overflow-x-auto">
          {links.map(({ href, label }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={`text-sm px-3 py-1.5 rounded-md whitespace-nowrap transition-colors ${
                  active
                    ? 'font-semibold text-foreground bg-accent'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                }`}
              >
                {label}
              </Link>
            )
          })}
        </div>
        <Link
          href="/markets/submit"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors shrink-0 ml-4"
        >
          <PlusCircle size={15} />
          Submit
        </Link>
      </div>
    </div>
  )
}
