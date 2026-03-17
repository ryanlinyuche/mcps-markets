'use client'

import { useState } from 'react'

export function LogoutButton() {
  const [loading, setLoading] = useState(false)

  async function handleLogout() {
    setLoading(true)
    await fetch('/api/auth/logout', { method: 'POST' })
    // Full reload so all client state (including this component's loading flag) is cleared
    window.location.href = '/login'
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="text-sm px-3 py-1.5 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50"
    >
      {loading ? 'Logging out…' : 'Logout'}
    </button>
  )
}
