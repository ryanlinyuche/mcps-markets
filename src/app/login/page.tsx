'use client'

import { useState } from 'react'
import { TrendingUp, AlertTriangle } from 'lucide-react'

export default function LoginPage() {
  const [mode, setMode] = useState<'studentvue' | 'fallback'>('studentvue')

  // StudentVUE fields
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)

  // Fallback fields
  const [fbStudentId, setFbStudentId] = useState('')
  const [fbFirstName, setFbFirstName] = useState('')

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleStudentVue(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, rememberMe }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Login failed'); return }
      window.location.href = '/markets'
    } catch {
      setError('Could not connect. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleFallback(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login-fallback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: fbStudentId,
          firstName: fbFirstName,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Login failed'); return }
      window.location.href = '/markets'
    } catch {
      setError('Could not connect. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const inputClass =
    'w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-4">

        {/* Outage notice */}
        <div className="flex gap-2 items-start bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-300 dark:border-yellow-700 rounded-lg px-4 py-3 text-sm text-yellow-800 dark:text-yellow-300">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          <span>
            <strong>StudentVUE login is temporarily unavailable</strong> due to a server upgrade by MCPS.
            If you already have an account, use the <strong>Current Users</strong> tab to sign in.
          </span>
        </div>

        <div className="bg-card border border-border rounded-xl shadow-sm p-8 space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="flex justify-center">
              <TrendingUp size={40} className="text-green-600" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">MCPS Markets</h1>
          </div>

          {/* Toggle */}
          <div className="flex rounded-lg border border-border overflow-hidden text-sm font-medium">
            <button
              type="button"
              onClick={() => { setMode('studentvue'); setError('') }}
              className={`flex-1 py-2 transition-colors ${
                mode === 'studentvue'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background text-muted-foreground hover:bg-muted'
              }`}
            >
              StudentVUE
            </button>
            <button
              type="button"
              onClick={() => { setMode('fallback'); setError('') }}
              className={`flex-1 py-2 transition-colors ${
                mode === 'fallback'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background text-muted-foreground hover:bg-muted'
              }`}
            >
              Current Users
            </button>
          </div>

          {/* ── StudentVUE form ── */}
          {mode === 'studentvue' && (
            <form onSubmit={handleStudentVue} className="space-y-4">
              <div className="space-y-1">
                <label htmlFor="username" className="text-sm font-medium">Student ID</label>
                <input
                  id="username"
                  type="text"
                  inputMode="numeric"
                  pattern="(?:^\d{6}$)|(?:^\d{8}$)"
                  placeholder="123456"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  required
                  className={inputClass}
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="password" className="text-sm font-medium">StudentVUE Password</label>
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className={inputClass}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="rememberMe"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-input accent-primary cursor-pointer"
                />
                <label htmlFor="rememberMe" className="text-sm text-muted-foreground cursor-pointer select-none">
                  Remember me for 30 days
                </label>
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-10 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
              <p className="text-xs text-muted-foreground text-center">
                Uses your real MCPS StudentVUE password. Your password is never stored.
              </p>
            </form>
          )}

          {/* ── Current Users fallback form ── */}
          {mode === 'fallback' && (
            <form onSubmit={handleFallback} className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Only existing accounts can use this login.
              </p>
              <div className="space-y-1">
                <label htmlFor="fb-id" className="text-sm font-medium">Student ID</label>
                <input
                  id="fb-id"
                  type="text"
                  inputMode="numeric"
                  placeholder="123456"
                  value={fbStudentId}
                  onChange={e => setFbStudentId(e.target.value)}
                  required
                  className={inputClass}
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="fb-name" className="text-sm font-medium">First Name</label>
                <input
                  id="fb-name"
                  type="text"
                  placeholder="e.g. Ryan"
                  value={fbFirstName}
                  onChange={e => setFbFirstName(e.target.value)}
                  required
                  className={inputClass}
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-10 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
