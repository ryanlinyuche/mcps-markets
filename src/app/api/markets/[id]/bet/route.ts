import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { placeBet } from '@/lib/market-math'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const { side, amount } = await request.json()

  if (!['YES', 'NO'].includes(side)) {
    return NextResponse.json({ error: 'Side must be YES or NO' }, { status: 400 })
  }

  const coins = Math.floor(Number(amount))
  if (!coins || coins < 1) {
    return NextResponse.json({ error: 'Amount must be at least 1 coin' }, { status: 400 })
  }

  try {
    const result = placeBet(Number(session.sub), Number(id), side, coins)
    return NextResponse.json({ success: true, newBalance: result.balance })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to place bet'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
