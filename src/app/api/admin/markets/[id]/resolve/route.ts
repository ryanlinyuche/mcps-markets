import { NextRequest, NextResponse } from 'next/server'
import { resolveMarket } from '@/lib/market-math'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { outcome } = await request.json()

  if (!['YES', 'NO'].includes(outcome)) {
    return NextResponse.json({ error: 'Outcome must be YES or NO' }, { status: 400 })
  }

  try {
    resolveMarket(Number(id), outcome)
    return NextResponse.json({ success: true })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to resolve market'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
