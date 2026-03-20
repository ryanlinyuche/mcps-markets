'use client'

import { useState } from 'react'
import { Scale } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function RulesGate() {
  const [accepted, setAccepted] = useState(false)
  const [loading, setLoading] = useState(false)

  if (accepted) return null

  async function handleAccept() {
    setLoading(true)
    await fetch('/api/auth/accept-rules', { method: 'POST' })
    setAccepted(true)
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-background border rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] flex flex-col">
        <div className="p-6 border-b flex items-center gap-3">
          <Scale size={22} className="text-blue-600" />
          <div>
            <h2 className="text-lg font-bold">Welcome to MCPS Markets!</h2>
            <p className="text-sm text-muted-foreground">Please read and accept the rules to continue.</p>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-4 text-sm">
          <Section title="🎯 Betting">
            <li>Bets are final — no cancellations once placed.</li>
            <li>Winners split the entire pool proportionally to how much they bet.</li>
            <li>If there are no winners, all bets are refunded.</li>
          </Section>
          <Section title="📊 Creating Markets">
            <li>Markets must be about real, verifiable MCPS-related events.</li>
            <li>You must provide clear resolution criteria and a verifiable source.</li>
            <li>All markets need admin approval before going live.</li>
            <li>Score markets about yourself require you to be the creator.</li>
          </Section>
          <Section title="✅ Resolving Markets">
            <li>Creators can request resolution by uploading proof (e.g. Canvas screenshot).</li>
            <li>Once resolution is requested, the market closes — no more bets.</li>
            <li>Admins review proof and approve or reject resolutions.</li>
            <li>False proof submissions may result in account removal.</li>
          </Section>
          <Section title="🏆 Monthly Winners">
            <li>The player with the most coins at the end of each month wins.</li>
            <li>Coins never reset — keep growing your balance!</li>
          </Section>
          <Section title="⚠️ Account Rules">
            <li>Everyone starts with 1,000 coins and earns 10 free coins per day.</li>
            <li>Accounts with no bets for 30+ days are automatically deleted.</li>
            <li>Deleted accounts lose all coins and must restart from scratch.</li>
            <li>No real money is involved. This platform is for fun only.</li>
          </Section>
        </div>

        <div className="p-4 border-t">
          <Button className="w-full" onClick={handleAccept} disabled={loading}>
            {loading ? 'Saving...' : 'I Accept — Let me in!'}
          </Button>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="font-semibold mb-1.5">{title}</p>
      <ul className="space-y-1 text-muted-foreground list-none pl-0">
        {children}
      </ul>
    </div>
  )
}
