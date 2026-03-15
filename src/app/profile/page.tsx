'use client'

import { useEffect, useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CoinDisplay } from '@/components/shared/CoinDisplay'
import { Position, Transaction } from '@/types'
import Link from 'next/link'

export default function ProfilePage() {
  const [positions, setPositions] = useState<(Position & { market_title: string; market_status: string; market_outcome: string | null })[]>([])
  const [transactions, setTransactions] = useState<(Transaction & { market_title: string | null })[]>([])
  const [user, setUser] = useState<{ name: string; balance: number } | null>(null)

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(setUser)
    fetch('/api/profile/positions').then(r => r.json()).then(setPositions)
    fetch('/api/profile/transactions').then(r => r.json()).then(setTransactions)
  }, [])

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{user?.name || 'Profile'}</h1>
        {user && (
          <div className="flex items-center gap-2 mt-1">
            <span className="text-muted-foreground text-sm">Balance:</span>
            <CoinDisplay amount={user.balance} />
          </div>
        )}
      </div>

      <Tabs defaultValue="positions">
        <TabsList>
          <TabsTrigger value="positions">Positions ({positions.length})</TabsTrigger>
          <TabsTrigger value="transactions">Transactions ({transactions.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="positions" className="mt-4">
          {positions.length === 0 ? (
            <p className="text-muted-foreground text-sm py-8 text-center">
              No positions yet. <Link href="/markets" className="underline">Browse markets</Link> to start betting.
            </p>
          ) : (
            <div className="space-y-2">
              {positions.map(pos => (
                <Link href={`/markets/${pos.market_id}`} key={pos.id}>
                  <div className="rounded-lg border p-3 hover:bg-muted/50 transition-colors">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <p className="text-sm font-medium">{pos.market_title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${pos.side === 'YES' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                            {pos.side}
                          </span>
                          <span className="text-xs text-muted-foreground capitalize">{pos.market_status}</span>
                          {pos.market_outcome && (
                            <span className={`text-xs font-medium ${pos.market_outcome === pos.side ? 'text-green-600' : 'text-red-500'}`}>
                              → {pos.market_outcome === pos.side ? 'Won' : 'Lost'}
                            </span>
                          )}
                        </div>
                      </div>
                      <CoinDisplay amount={pos.coins_bet} size="sm" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="transactions" className="mt-4">
          {transactions.length === 0 ? (
            <p className="text-muted-foreground text-sm py-8 text-center">No transactions yet.</p>
          ) : (
            <div className="space-y-2">
              {transactions.map(tx => (
                <div key={tx.id} className="rounded-lg border p-3 flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium">{tx.description || tx.type}</p>
                    {tx.market_title && (
                      <p className="text-xs text-muted-foreground">{tx.market_title}</p>
                    )}
                    <p className="text-xs text-muted-foreground">{new Date(tx.created_at).toLocaleDateString()}</p>
                  </div>
                  <span className={`font-semibold text-sm ${tx.amount >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {tx.amount >= 0 ? '+' : ''}{tx.amount.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
