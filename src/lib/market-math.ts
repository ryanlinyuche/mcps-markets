import { db } from './db'

export const SCORE_OPTIONS = [
  { label: 'A (90–100)', sort_order: 0 },
  { label: 'B (80–89)',  sort_order: 1 },
  { label: 'C (70–79)',  sort_order: 2 },
  { label: 'D (60–69)',  sort_order: 3 },
  { label: 'F (below 60)', sort_order: 4 },
]

export function computeOdds(yesPool: number, noPool: number) {
  const total = yesPool + noPool
  if (total === 0) return { yesPrice: 0.5, noPrice: 0.5 }
  return {
    yesPrice: yesPool / total,
    noPrice: noPool / total,
  }
}

export function computeScoreOdds(options: { label: string; amount: number }[]) {
  const total = options.reduce((s, o) => s + o.amount, 0)
  return options.map(o => ({
    ...o,
    price: total === 0 ? 1 / options.length : o.amount / total,
  }))
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

    const updated = db.prepare('SELECT yes_pool, no_pool FROM markets WHERE id = ?').get(marketId) as { yes_pool: number; no_pool: number }
    db.prepare('INSERT INTO market_history (market_id, yes_pool, no_pool) VALUES (?, ?, ?)').run(marketId, updated.yes_pool, updated.no_pool)

    return db.prepare('SELECT balance FROM users WHERE id = ?').get(userId) as { balance: number }
  }
)

export const placeScoreBet = db.transaction(
  (userId: number, marketId: number, optionLabel: string, amount: number) => {
    const user = db.prepare('SELECT balance FROM users WHERE id = ?').get(userId) as { balance: number } | undefined
    if (!user) throw new Error('User not found')
    if (user.balance < amount) throw new Error('Insufficient balance')

    const market = db.prepare('SELECT status, market_type FROM markets WHERE id = ?').get(marketId) as { status: string; market_type: string } | undefined
    if (!market) throw new Error('Market not found')
    if (market.status !== 'open') throw new Error('Market is not open for betting')
    if (market.market_type !== 'score' && market.market_type !== 'personal_score') throw new Error('Not a score market')

    const option = db.prepare('SELECT label FROM option_pools WHERE market_id = ? AND label = ?').get(marketId, optionLabel)
    if (!option) throw new Error('Invalid option')

    db.prepare('UPDATE users SET balance = balance - ? WHERE id = ?').run(amount, userId)
    db.prepare('UPDATE option_pools SET amount = amount + ? WHERE market_id = ? AND label = ?').run(amount, marketId, optionLabel)

    db.prepare(`
      INSERT INTO positions (user_id, market_id, side, coins_bet)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(user_id, market_id, side) DO UPDATE SET
        coins_bet = coins_bet + excluded.coins_bet
    `).run(userId, marketId, optionLabel, amount)

    db.prepare(`
      INSERT INTO transactions (user_id, type, amount, market_id, description)
      VALUES (?, 'bet_placed', ?, ?, ?)
    `).run(userId, -amount, marketId, `Bet ${amount} coins on "${optionLabel}"`)

    // Record snapshot for chart history
    const pools = db.prepare('SELECT label, amount FROM option_pools WHERE market_id = ?').all(marketId) as { label: string; amount: number }[]
    const snapshot = JSON.stringify(Object.fromEntries(pools.map(p => [p.label, p.amount])))
    db.prepare('INSERT INTO market_history (market_id, yes_pool, no_pool, snapshot) VALUES (?, 0, 0, ?)').run(marketId, snapshot)

    return db.prepare('SELECT balance FROM users WHERE id = ?').get(userId) as { balance: number }
  }
)

export const resolveMarket = db.transaction((marketId: number, outcome: 'YES' | 'NO', resolvedBy?: number, notes?: string | null) => {
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
    UPDATE markets SET status = 'resolved', outcome = ?, resolved_at = datetime('now'),
      resolved_by = ?, resolution_notes = ?
    WHERE id = ?
  `).run(outcome, resolvedBy ?? null, notes ?? null, marketId)
})

export const resolveMarketNA = db.transaction((marketId: number, resolvedBy: number, notes: string | null) => {
  const market = db.prepare('SELECT status FROM markets WHERE id = ?').get(marketId) as { status: string } | undefined
  if (!market) throw new Error('Market not found')
  if (market.status !== 'open') throw new Error('Market is not open')

  const allBettors = db.prepare('SELECT * FROM positions WHERE market_id = ?').all(marketId) as { user_id: number; coins_bet: number }[]
  for (const pos of allBettors) {
    db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?').run(pos.coins_bet, pos.user_id)
    db.prepare(`
      INSERT INTO transactions (user_id, type, amount, market_id, description)
      VALUES (?, 'refund', ?, ?, 'Market cancelled (N/A) — refunded')
    `).run(pos.user_id, pos.coins_bet, marketId)
  }

  db.prepare(`
    UPDATE markets SET status = 'resolved', outcome = 'N/A', resolved_at = datetime('now'),
      resolved_by = ?, resolution_notes = ?
    WHERE id = ?
  `).run(resolvedBy, notes || null, marketId)
})

export const resolveScoreMarket = db.transaction((marketId: number, winningLabel: string, resolvedBy?: number, notes?: string | null) => {
  const market = db.prepare('SELECT status, market_type FROM markets WHERE id = ?').get(marketId) as {
    status: string; market_type: string
  } | undefined
  if (!market) throw new Error('Market not found')
  if (market.status !== 'open') throw new Error('Market is not open')
  if (market.market_type !== 'score' && market.market_type !== 'personal_score') throw new Error('Not a score market')

  const pools = db.prepare('SELECT label, amount FROM option_pools WHERE market_id = ?').all(marketId) as { label: string; amount: number }[]
  const totalPool = pools.reduce((s, p) => s + p.amount, 0)
  const winPool = pools.find(p => p.label === winningLabel)?.amount ?? 0

  if (winPool === 0) {
    const allBettors = db.prepare('SELECT * FROM positions WHERE market_id = ?').all(marketId) as { user_id: number; coins_bet: number }[]
    for (const pos of allBettors) {
      db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?').run(pos.coins_bet, pos.user_id)
      db.prepare(`
        INSERT INTO transactions (user_id, type, amount, market_id, description)
        VALUES (?, 'refund', ?, ?, 'Market resolved with no winning bets — refunded')
      `).run(pos.user_id, pos.coins_bet, marketId)
    }
  } else {
    const winners = db.prepare(
      'SELECT * FROM positions WHERE market_id = ? AND side = ?'
    ).all(marketId, winningLabel) as { user_id: number; coins_bet: number }[]
    for (const pos of winners) {
      const payout = Math.floor((pos.coins_bet / winPool) * totalPool)
      db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?').run(payout, pos.user_id)
      db.prepare(`
        INSERT INTO transactions (user_id, type, amount, market_id, description)
        VALUES (?, 'payout', ?, ?, ?)
      `).run(pos.user_id, payout, marketId, `Won ${payout} coins — resolved "${winningLabel}"`)
    }
  }

  db.prepare(`
    UPDATE markets SET status = 'resolved', outcome = ?, resolved_at = datetime('now'),
      resolved_by = ?, resolution_notes = ?
    WHERE id = ?
  `).run(winningLabel, resolvedBy ?? null, notes ?? null, marketId)
})
