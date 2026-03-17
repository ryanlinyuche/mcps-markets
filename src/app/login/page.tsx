'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { TrendingUp } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Login failed')
        return
      }

      window.location.href = '/markets'
    } catch {
      setError('Could not connect. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="w-full max-w-sm bg-card border border-border rounded-xl shadow-sm p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <TrendingUp size={40} className="text-green-600" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">MCPS Markets</h1>
          <p className="text-sm text-muted-foreground">
            Sign in with your StudentVUE credentials
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="username" className="text-sm font-medium">
              Student ID
            </label>
            <input
              id="username"
              type="text"
              inputMode="numeric"
              pattern="\d{6,7}"
              placeholder="1234567"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-10 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p className="text-xs text-muted-foreground text-center">
          Uses your real MCPS StudentVUE password. Your password is never stored.
        </p>
      </div>
    </div>
  )
}
