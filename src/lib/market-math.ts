import { db } from './db'

export function computeOdds(yesPool: number, noPool: number) {
  const total = yesPool + noPool
  if (total === 0) return { yesPrice: 0.5, noPrice: 0.5 }
  return {
    yesPrice: yesPool / total,
    noPrice: noPool / total,
  }
}

export const placeBet = db.transaction(
  (userId: number, marketId: number, side: 'YES' | 'NO', amount: number) => {
    const user = db.prepare('SELECT balance FROM users WHERE id = ?').get(userId) as { balance: number } | undefined
    if (!user) throw new Error('User not found')
    if (user.balance < amount) throw new Error('Insufficient balance')

    const market = db.prepare('SELECT * FROM markets WHERE id = ?').get(marketId) as { status: string } | undefined
    if (!market) throw new Error('Market not found')
    if (market.status !== 'open') throw new Error('Market is not open for betting')

    db.prepare('UPDATE users SET balance = balance - ? WHERE id = ?').run(amount, userId)

    const poolCol = side === 'YES' ? 'yes_pool' : 'no_pool'
    db.prepare(`UPDATE markets SET ${poolCol} = ${poolCol} + ? WHERE id = ?`).run(amount, marketId)

    db.prepare(`
      INSERT INTO positions (user_id, market_id, side, coins_bet)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(user_id, market_id, side) DO UPDATE SET
        coins_bet = coins_bet + excluded.coins_bet
    `).run(userId, marketId, side, amount)

    db.prepare(`
      INSERT INTO transactions (user_id, type, amount, market_id, description)
      VALUES (?, 'bet_placed', ?, ?, ?)
    `).run(userId, -amount, marketId, `Bet ${amount} coins on ${side}`)

    return db.prepare('SELECT balance FROM users WHERE id = ?').get(userId) as { balance: number }
  }
)

export const resolveMarket = db.transaction((marketId: number, outcome: 'YES' | 'NO') => {
  const market = db.prepare('SELECT * FROM markets WHERE id = ?').get(marketId) as {
    status: string; yes_pool: number; no_pool: number
  } | undefined
  if (!market) throw new Error('Market not found')
  if (market.status !== 'open') throw new Error('Market is not open')

  const winPool = outcome === 'YES' ? market.yes_pool : market.no_pool
  const totalPool = market.yes_pool + market.no_pool

  const winners = db.prepare(
    'SELECT * FROM positions WHERE market_id = ? AND side = ?'
  ).all(marketId, outcome) as { user_id: number; coins_bet: number }[]

  if (winPool === 0) {
    // Nobody bet the winning side — refund everyone
    const allBettors = db.prepare(
      'SELECT * FROM positions WHERE market_id = ?'
    ).all(marketId) as { user_id: number; coins_bet: number }[]

    for (const pos of allBettors) {
      db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?').run(pos.coins_bet, pos.user_id)
      db.prepare(`
        INSERT INTO transactions (user_id, type, amount, market_id, description)
        VALUES (?, 'refund', ?, ?, 'Market resolved with no winning bets — refunded')
      `).run(pos.user_id, pos.coins_bet, marketId)
    }
  } else {
    for (const pos of winners) {
      const payout = Math.floor((pos.coins_bet / winPool) * totalPool)
      db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?').run(payout, pos.user_id)
      db.prepare(`
        INSERT INTO transactions (user_id, type, amount, market_id, description)
        VALUES (?, 'payout', ?, ?, ?)
      `).run(pos.user_id, payout, marketId, `Won ${payout} coins — market resolved ${outcome}`)
    }
  }

  db.prepare(`
    UPDATE markets SET status = 'resolved', outcome = ?, resolved_at = datetime('now')
    WHERE id = ?
  `).run(outcome, marketId)
})
