'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Market, OptionPool } from '@/types'
import { toast } from 'sonner'
import { CoinDisplay } from '@/components/shared/CoinDisplay'
import { ArrowLeft, AlertTriangle, ImagePlus, X } from 'lucide-react'
import Link from 'next/link'

type MarketWithExtras = Market & {
  yes_price: number
  no_price: number
  option_pools?: OptionPool[]
  flag_count?: number
}

export default function ResolvePage() {
  const { id } = useParams() as { id: string }
  const router = useRouter()
  const [market, setMarket] = useState<MarketWithExtras | null>(null)
  const [loading, setLoading] = useState(false)
  const [notes, setNotes] = useState('')
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [proofPreview, setProofPreview] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch(`/api/markets/${id}`).then(r => r.json()).then(setMarket)
  }, [id])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { toast.error('Only image files are supported'); return }
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5MB'); return }
    setProofFile(file)
    setProofPreview(URL.createObjectURL(file))
  }

  function clearProof() {
    setProofFile(null)
    setProofPreview(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleResolve(outcome: string) {
    if (!proofFile && outcome !== 'N/A') {
      toast.error('Upload proof image before resolving')
      return
    }
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('outcome', outcome)
      if (notes.trim()) formData.append('resolution_notes', notes.trim())
      if (proofFile) formData.append('file', proofFile)

      const res = await fetch(`/api/admin/markets/${id}/resolve`, {
        method: 'POST',
        body: formData,
      })
      if (res.ok) {
        toast.success(`Market resolved: ${outcome}`)
        router.push('/admin/markets')
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to resolve')
      }
    } catch {
      toast.error('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  async function handleApprove() {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/markets/${id}/approve-resolution`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolution_notes: notes }),
      })
      if (res.ok) {
        toast.success('Resolution approved — coins distributed')
        router.push('/admin/markets')
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to approve')
      }
    } catch {
      toast.error('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  async function handleReject() {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/markets/${id}/reject-resolution`, { method: 'POST' })
      if (res.ok) {
        toast.success('Resolution request rejected — market returned to open')
        router.push('/admin/markets')
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to reject')
      }
    } catch {
      toast.error('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (!market) return <p className="text-muted-foreground">Loading...</p>

  const isScore = market.market_type === 'score' || market.market_type === 'personal_score'
  const total = isScore
    ? (market.option_pools?.reduce((s, o) => s + o.amount, 0) ?? 0)
    : market.yes_pool + market.no_pool
  const isPendingResolution = market.status === 'pending_resolution'

  return (
    <div className="max-w-xl space-y-6">
      <Link href="/admin/markets" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft size={14} /> Back
      </Link>

      <div>
        <h2 className="text-xl font-bold">Resolve Market</h2>
        <p className="text-muted-foreground mt-1">{market.title}</p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {isScore && (
            <p className="text-xs font-medium text-blue-600 bg-blue-50 rounded px-2 py-0.5 w-fit">
              Test Score Market
            </p>
          )}
          {(market.flag_count ?? 0) > 0 && (
            <p className="text-xs font-medium text-orange-700 bg-orange-50 rounded px-2 py-0.5 w-fit">
              &#128681; {market.flag_count} user{market.flag_count !== 1 ? 's' : ''} flagged for resolution
            </p>
          )}
        </div>
      </div>

      {/* Creator resolution request — admin just approves */}
      {isPendingResolution && market.pending_outcome && (
        <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-4 space-y-4">
          <div>
            <p className="text-sm font-semibold text-yellow-900">Creator Resolution Request</p>
            <p className="text-xs text-yellow-700 mt-0.5">
              The market creator has proposed resolving this market as: <span className="font-bold">{market.pending_outcome}</span>
            </p>
          </div>
          {market.resolution_proof && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-yellow-800 uppercase tracking-wide">Submitted Proof</p>
              <a href={market.resolution_proof} target="_blank" rel="noopener noreferrer">
                <img src={market.resolution_proof} alt="Resolution proof"
                  className="rounded-md border border-yellow-200 max-h-64 w-full object-contain bg-white hover:opacity-90 transition-opacity cursor-pointer" />
              </a>
              <p className="text-xs text-yellow-700">Click to open full size</p>
            </div>
          )}
          <div className="space-y-1">
            <label className="text-sm font-medium text-yellow-900">Resolution Notes (optional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Add a note visible to all users..."
              className="w-full min-h-[60px] px-3 py-2 text-sm border border-yellow-200 rounded-md bg-white resize-none focus:outline-none focus:ring-2 focus:ring-yellow-400"
              maxLength={500}
            />
          </div>
          <div className="flex gap-3">
            <Button className="bg-green-600 hover:bg-green-700 flex-1" onClick={handleApprove} disabled={loading}>
              Approve &amp; Distribute Coins
            </Button>
            <Button variant="outline" className="border-red-300 text-red-600 hover:bg-red-50 flex-1" onClick={handleReject} disabled={loading}>
              Reject Request
            </Button>
          </div>
          <p className="text-xs text-yellow-700">Approving will resolve the market and pay out winners. Rejecting returns it to open.</p>
        </div>
      )}

      {/* Resolution criteria */}
      {(market.resolution_criteria || market.resolution_source) && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 space-y-2">
          <p className="text-sm font-semibold text-blue-800">Resolution Rules</p>
          {market.resolution_criteria && (
            <div>
              <p className="text-xs text-blue-700 font-medium uppercase tracking-wide">Criteria</p>
              <p className="text-sm text-blue-900">{market.resolution_criteria}</p>
            </div>
          )}
          {market.resolution_source && (
            <div>
              <p className="text-xs text-blue-700 font-medium uppercase tracking-wide">Source</p>
              <p className="text-sm text-blue-900">{market.resolution_source}</p>
            </div>
          )}
        </div>
      )}

      {/* Pool breakdown */}
      {isScore && market.option_pools ? (
        <div className="rounded-lg border divide-y">
          {market.option_pools.map(opt => (
            <div key={opt.label} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium">{opt.label}</p>
                <p className="text-xs text-muted-foreground">{opt.amount.toLocaleString()} coins wagered</p>
              </div>
              <CoinDisplay amount={opt.amount} size="sm" />
            </div>
          ))}
          <div className="px-4 py-3 flex justify-between items-center">
            <p className="text-sm text-muted-foreground font-medium">Total wagered</p>
            <CoinDisplay amount={total} />
          </div>
        </div>
      ) : (
        <div className="rounded-lg border p-4 grid grid-cols-2 gap-4 text-center">
          <div>
            <p className="text-sm text-muted-foreground">{market.team_a ?? 'YES'} pool</p>
            <CoinDisplay amount={market.yes_pool} size="lg" />
            <p className="text-sm text-green-600 font-medium mt-1">{Math.round((market.yes_price ?? 0.5) * 100)}%</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{market.team_b ?? 'NO'} pool</p>
            <CoinDisplay amount={market.no_pool} size="lg" />
            <p className="text-sm text-red-500 font-medium mt-1">{Math.round((market.no_price ?? 0.5) * 100)}%</p>
          </div>
          <div className="col-span-2 border-t pt-3">
            <p className="text-sm text-muted-foreground">Total wagered</p>
            <CoinDisplay amount={total} />
          </div>
        </div>
      )}

      {/* Manual resolution — proof upload + notes */}
      {!isPendingResolution && (
        <div className="space-y-4">
          {/* Proof upload */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Proof Image <span className="text-destructive">*</span>
              <span className="text-xs font-normal text-muted-foreground ml-1">(required for YES/NO, optional for N/A)</span>
            </label>

            {proofPreview ? (
              <div className="relative rounded-lg border border-border overflow-hidden">
                <img src={proofPreview} alt="Proof preview" className="w-full max-h-56 object-contain bg-muted" />
                <button
                  onClick={clearProof}
                  className="absolute top-2 right-2 rounded-full bg-black/60 p-1 hover:bg-black/80 transition-colors"
                >
                  <X size={14} className="text-white" />
                </button>
                <p className="text-xs text-muted-foreground px-3 py-2 border-t border-border">{proofFile?.name}</p>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex flex-col items-center gap-2 w-full rounded-lg border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/50 transition-colors p-6 text-sm text-muted-foreground"
              >
                <ImagePlus size={22} className="text-muted-foreground" />
                <span>Click to upload screenshot or image proof</span>
                <span className="text-xs">PNG, JPG, GIF · max 5MB</span>
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <label className="text-sm font-medium">Resolution Notes (optional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Class average was 78.4, confirmed via Canvas gradebook on 3/15"
              className="w-full min-h-[80px] px-3 py-2 text-sm border rounded-md bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground">Explain your resolution. Visible to all users.</p>
          </div>
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        Winners will receive a proportional payout from the total pool. This action cannot be undone.
      </p>

      {!isPendingResolution && (
        <>
          {isScore && market.option_pools ? (
            <div className="grid grid-cols-1 gap-3">
              {market.option_pools.map(opt => (
                <Button
                  key={opt.label}
                  variant="outline"
                  className="h-12 text-base justify-start px-4"
                  onClick={() => handleResolve(opt.label)}
                  disabled={loading}
                >
                  Resolve: {opt.label}
                </Button>
              ))}
            </div>
          ) : market.market_type === 'sports' && market.team_a && market.team_b ? (
            <div className="grid grid-cols-2 gap-4">
              <Button
                className="bg-green-600 hover:bg-green-700 h-16 text-base"
                onClick={() => handleResolve(market.team_a!)}
                disabled={loading}
              >
                {market.team_a} Wins
              </Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700 h-16 text-base"
                onClick={() => handleResolve(market.team_b!)}
                disabled={loading}
              >
                {market.team_b} Wins
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <Button
                className="bg-green-600 hover:bg-green-700 h-16 text-lg"
                onClick={() => handleResolve('YES')}
                disabled={loading}
              >
                Resolve YES
              </Button>
              <Button
                className="bg-red-500 hover:bg-red-600 h-16 text-lg"
                onClick={() => handleResolve('NO')}
                disabled={loading}
              >
                Resolve NO
              </Button>
            </div>
          )}

          {/* N/A Cancel */}
          <div className="border-t pt-4">
            <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
              <AlertTriangle size={12} />
              If the event was cancelled or the outcome can&apos;t be determined:
            </p>
            <Button
              variant="outline"
              className="w-full border-red-200 text-red-600 hover:bg-red-50"
              onClick={() => handleResolve('N/A')}
              disabled={loading}
            >
              Resolve N/A &mdash; Refund All Bets
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
