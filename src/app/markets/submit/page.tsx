'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

export default function SubmitMarketPage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [closesAt, setClosesAt] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (title.trim().length < 5) {
      toast.error('Title must be at least 5 characters')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/markets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), description: description.trim(), closes_at: closesAt || null }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Failed to submit market')
        return
      }
      toast.success('Market submitted! An admin will review it shortly.')
      router.push('/markets')
    } catch {
      toast.error('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Submit a Market</CardTitle>
          <CardDescription>
            Propose a yes/no question. An admin will review and approve it before it goes live.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="title">Question *</Label>
              <Input
                id="title"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Will MCPS cancel school on Dec 20?"
                required
                maxLength={200}
              />
              <p className="text-xs text-muted-foreground">Must be a clear YES/NO question</p>
            </div>
            <div className="space-y-1">
              <Label htmlFor="description">Description (optional)</Label>
              <textarea
                id="description"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Add any context or resolution criteria..."
                className="w-full min-h-[80px] px-3 py-2 text-sm border rounded-md bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                maxLength={500}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="closesAt">Closes at (optional)</Label>
              <Input
                id="closesAt"
                type="date"
                value={closesAt}
                onChange={e => setClosesAt(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <><Loader2 size={16} className="mr-2 animate-spin" /> Submitting...</> : 'Submit for Review'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
