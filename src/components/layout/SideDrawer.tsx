'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { Menu, X, Trophy, BarChart2, User, ShieldCheck, Sun, Moon, Activity } from 'lucide-react'

interface SideDrawerProps {
  isAdmin: boolean
}

export function SideDrawer({ isAdmin }: SideDrawerProps) {
  const [open, setOpen] = useState(false)
  const [dark, setDark] = useState(false)
  // We need to wait for mount before using createPortal (no document on server)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setDark(document.documentElement.classList.contains('dark'))
  }, [])

  // Close on Escape key
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Prevent body scroll when open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  function toggleTheme() {
    const next = !dark
    setDark(next)
    if (next) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }

  const close = () => setOpen(false)

  // The overlay + panel are portaled to document.body so they escape the
  // navbar's stacking context (sticky + z-index creates a new stacking context
  // that would trap fixed children and prevent full-screen coverage).
  const portal = mounted ? createPortal(
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={close}
        aria-hidden
      />

      {/* Drawer panel */}
      <div
        className={`fixed top-0 right-0 h-full w-72 z-[201] bg-card border-l border-border shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 h-14 border-b border-border shrink-0">
          <span className="font-semibold text-foreground text-sm">Menu</span>
          <button
            onClick={close}
            className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          <DrawerItem href="/winners"     icon={<Trophy size={17} />}     label="Winners"     onClick={close} />
          <DrawerItem href="/leaderboard" icon={<BarChart2 size={17} />}  label="Leaderboard" onClick={close} />
          <DrawerItem href="/activity"    icon={<Activity size={17} />}   label="Activity"    onClick={close} />
          <DrawerItem href="/profile"     icon={<User size={17} />}       label="Profile"     onClick={close} />
          {isAdmin && (
            <DrawerItem
              href="/admin"
              icon={<ShieldCheck size={17} />}
              label="Admin"
              onClick={close}
              className="text-purple-500 dark:text-purple-400 hover:!text-purple-600 dark:hover:!text-purple-300"
            />
          )}
        </nav>

        {/* Bottom — theme toggle */}
        <div className="p-4 border-t border-border">
          <button
            onClick={toggleTheme}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors text-left"
          >
            {dark ? <Sun size={17} /> : <Moon size={17} />}
            <span>{dark ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
        </div>
      </div>
    </>,
    document.body,
  ) : null

  return (
    <>
      {/* Hamburger button — stays inside the navbar */}
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg p-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        aria-label="Open menu"
      >
        <Menu size={20} />
      </button>

      {portal}
    </>
  )
}

function DrawerItem({
  href,
  icon,
  label,
  onClick,
  className = '',
}: {
  href: string
  icon: React.ReactNode
  label: string
  onClick: () => void
  className?: string
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-muted-foreground hover:text-foreground hover:bg-muted ${className}`}
    >
      {icon}
      <span>{label}</span>
    </Link>
  )
}
