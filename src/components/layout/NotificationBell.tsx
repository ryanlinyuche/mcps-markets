'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Bell } from 'lucide-react'
import Link from 'next/link'

interface Notification {
  id: number
  type: string
  market_id: number | null
  message: string
  read: number
  created_at: string
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [mounted, setMounted] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [rect, setRect] = useState<DOMRect | null>(null)

  useEffect(() => { setMounted(true) }, [])

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications')
      if (res.ok) setNotifications(await res.json())
    } catch { /* ignore */ }
  }

  useEffect(() => {
    fetchNotifications()
    const id = setInterval(fetchNotifications, 30_000)
    return () => clearInterval(id)
  }, [])

  const unread = notifications.filter(n => !n.read).length

  function openDropdown() {
    if (buttonRef.current) setRect(buttonRef.current.getBoundingClientRect())
    setOpen(true)
    if (unread > 0) {
      fetch('/api/notifications', { method: 'POST' }).then(fetchNotifications)
    }
  }

  const dropdown = mounted && open && rect ? createPortal(
    <>
      <div className="fixed inset-0 z-[200]" onClick={() => setOpen(false)} />
      <div
        style={{
          position: 'fixed',
          top: rect.bottom + 8,
          right: Math.max(8, window.innerWidth - rect.right),
          zIndex: 201,
          width: 340,
        }}
        className="bg-card border border-border rounded-xl shadow-2xl overflow-hidden"
      >
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <p className="font-semibold text-sm">Notifications</p>
          {unread > 0 && (
            <span className="text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded-full font-bold">
              {unread} new
            </span>
          )}
        </div>
        <div className="max-h-[380px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">
              <Bell size={28} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No notifications yet</p>
              <p className="text-xs mt-1 opacity-70">You'll be notified when bets resolve</p>
            </div>
          ) : (
            notifications.map(n => (
              <div
                key={n.id}
                className={`border-b border-border last:border-0 transition-colors ${!n.read ? 'bg-primary/5' : ''}`}
              >
                {n.market_id ? (
                  <Link
                    href={`/markets/${n.market_id}`}
                    onClick={() => setOpen(false)}
                    className="block px-4 py-3 hover:bg-muted/50"
                  >
                    <p className="text-sm text-foreground leading-snug">{n.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">{timeAgo(n.created_at)}</p>
                  </Link>
                ) : (
                  <div className="px-4 py-3">
                    <p className="text-sm text-foreground leading-snug">{n.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">{timeAgo(n.created_at)}</p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </>,
    document.body,
  ) : null

  return (
    <>
      <button
        ref={buttonRef}
        onClick={openDropdown}
        className="relative rounded-lg p-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {dropdown}
    </>
  )
}
