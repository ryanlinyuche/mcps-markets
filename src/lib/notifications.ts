import { db } from './db'

/**
 * Create a "market resolved" notification for every user who had a position.
 * Call this AFTER the market-math transaction has committed.
 */
export async function notifyMarketResolved(
  marketId: number,
  marketTitle: string,
  outcome: string,
) {
  const positions = await db.execute({
    sql: 'SELECT DISTINCT user_id, side FROM positions WHERE market_id = ?',
    args: [marketId],
  })

  for (const row of positions.rows as unknown as { user_id: number; side: string }[]) {
    let message: string
    if (outcome === 'N/A') {
      message = `"${marketTitle}" was cancelled — your coins were refunded`
    } else {
      const won = row.side.toUpperCase() === outcome.toUpperCase()
      message = won
        ? `🎉 You won on "${marketTitle}" (resolved: ${outcome})`
        : `"${marketTitle}" resolved ${outcome} — better luck next time`
    }

    try {
      await db.execute({
        sql: `INSERT INTO notifications (user_id, type, market_id, message) VALUES (?, 'market_resolved', ?, ?)`,
        args: [row.user_id, marketId, message],
      })
    } catch {
      // non-critical — don't let notification failure break the resolve
    }
  }
}
