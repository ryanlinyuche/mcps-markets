import { db } from './db'

export const SCORE_OPTIONS = [
  { label: 'A (90\u2013100)', sort_order: 0 },
  { label: 'B (80\u201389)',  sort_order: 1 },
  { label: 'C (70\u201379)',  sort_order: 2 },
  { label: 'D (60\u201369)',  sort_order: 3 },
  { label: 'F (below 60)', sort_order: 4 },
]

export function computeOdds(yesPool: number, noPool: number) {
  const total = yesPool + noPool
  if (total === 0) return { yesPrice: 0.5, noPrice: 0.5 }
  return { yesPrice: yesPool / total, noPrice: noPool / total }
}

export function computeScoreOdds(options: { label: string; amount: number }[]) {
  const total = options.reduce((s, o) => s + o.amount, 0)
  return options.map(o => ({
    ...o,
    price: total === 0 ? 1 / options.length : o.amount / total,
  }))
}

export async function placeBet(userId: number, marketId: number, side: 'YES' | 'NO', amount: number) {
  const txn = await db.transaction('write')
  try {
    const userRes = await txn.execute({ sql: 'SELECT balance FROM users WHERE id = ?', args: [userId] })
    const user = userRes.rows[0] as unknown as { balance: number } | undefined
    if (!user) throw new Error('User not found')
    if (user.balance < amount) throw new Error('Insufficient balance')

    const marketRes = await txn.execute({ sql: 'SELECT status FROM markets WHERE id = ?', args: [marketId] })
    const market = marketRes.rows[0] as unknown as { status: string } | undefined
    if (!market) throw new Error('Market not found')
    if (market.status !== 'open') throw new Error('Market is not open for betting')

    await txn.execute({ sql: 'UPDATE users SET balance = balance - ? WHERE id = ?', args: [amount, userId] })
    const poolCol = side === 'YES' ? 'yes_pool' : 'no_pool'
    await txn.execute({ sql: `UPDATE markets SET ${poolCol} = ${poolCol} + ? WHERE id = ?`, args: [amount, marketId] })

    await txn.execute({
      sql: `INSERT INTO positions (user_id, market_id, side, coins_bet) VALUES (?, ?, ?, ?)
            ON CONFLICT(user_id, market_id, side) DO UPDATE SET coins_bet = coins_bet + excluded.coins_bet`,
      args: [userId, marketId, side, amount],
    })
    await txn.execute({
      sql: `INSERT INTO transactions (user_id, type, amount, market_id, description) VALUES (?, 'bet_placed', ?, ?, ?)`,
      args: [userId, -amount, marketId, `Bet ${amount} coins on ${side}`],
    })

    const updRes = await txn.execute({ sql: 'SELECT yes_pool, no_pool FROM markets WHERE id = ?', args: [marketId] })
    const updated = updRes.rows[0] as unknown as { yes_pool: number; no_pool: number }
    await txn.execute({
      sql: 'INSERT INTO market_history (market_id, yes_pool, no_pool) VALUES (?, ?, ?)',
      args: [marketId, updated.yes_pool, updated.no_pool],
    })

    const balRes = await txn.execute({ sql: 'SELECT balance FROM users WHERE id = ?', args: [userId] })
    const newBal = balRes.rows[0] as unknown as { balance: number }
    await txn.commit()
    return newBal
  } catch (e) {
    await txn.rollback()
    throw e
  }
}

export async function placeScoreBet(userId: number, marketId: number, optionLabel: string, amount: number) {
  const txn = await db.transaction('write')
  try {
    const userRes = await txn.execute({ sql: 'SELECT balance FROM users WHERE id = ?', args: [userId] })
    const user = userRes.rows[0] as unknown as { balance: number } | undefined
    if (!user) throw new Error('User not found')
    if (user.balance < amount) throw new Error('Insufficient balance')

    const marketRes = await txn.execute({ sql: 'SELECT status, market_type FROM markets WHERE id = ?', args: [marketId] })
    const market = marketRes.rows[0] as unknown as { status: string; market_type: string } | undefined
    if (!market) throw new Error('Market not found')
    if (market.status !== 'open') throw new Error('Market is not open for betting')
    if (market.market_type !== 'score' && market.market_type !== 'personal_score') throw new Error('Not a score market')

    const optRes = await txn.execute({ sql: 'SELECT label FROM option_pools WHERE market_id = ? AND label = ?', args: [marketId, optionLabel] })
    if (!optRes.rows[0]) throw new Error('Invalid option')

    await txn.execute({ sql: 'UPDATE users SET balance = balance - ? WHERE id = ?', args: [amount, userId] })
    await txn.execute({ sql: 'UPDATE option_pools SET amount = amount + ? WHERE market_id = ? AND label = ?', args: [amount, marketId, optionLabel] })

    await txn.execute({
      sql: `INSERT INTO positions (user_id, market_id, side, coins_bet) VALUES (?, ?, ?, ?)
            ON CONFLICT(user_id, market_id, side) DO UPDATE SET coins_bet = coins_bet + excluded.coins_bet`,
      args: [userId, marketId, optionLabel, amount],
    })
    await txn.execute({
      sql: `INSERT INTO transactions (user_id, type, amount, market_id, description) VALUES (?, 'bet_placed', ?, ?, ?)`,
      args: [userId, -amount, marketId, `Bet ${amount} coins on "${optionLabel}"`],
    })

    const poolsRes = await txn.execute({ sql: 'SELECT label, amount FROM option_pools WHERE market_id = ?', args: [marketId] })
    const pools = poolsRes.rows as unknown as { label: string; amount: number }[]
    const snapshot = JSON.stringify(Object.fromEntries(pools.map(p => [p.label, p.amount])))
    await txn.execute({
      sql: 'INSERT INTO market_history (market_id, yes_pool, no_pool, snapshot) VALUES (?, 0, 0, ?)',
      args: [marketId, snapshot],
    })

    const balRes = await txn.execute({ sql: 'SELECT balance FROM users WHERE id = ?', args: [userId] })
    const newBal = balRes.rows[0] as unknown as { balance: number }
    await txn.commit()
    return newBal
  } catch (e) {
    await txn.rollback()
    throw e
  }
}

export async function resolveMarket(marketId: number, outcome: 'YES' | 'NO', resolvedBy?: number, notes?: string | null) {
  const txn = await db.transaction('write')
  try {
    const marketRes = await txn.execute({ sql: 'SELECT status, yes_pool, no_pool FROM markets WHERE id = ?', args: [marketId] })
    const market = marketRes.rows[0] as unknown as { status: string; yes_pool: number; no_pool: number } | undefined
    if (!market) throw new Error('Market not found')
    if (market.status !== 'open' && market.status !== 'pending_resolution') throw new Error('Market is not open')

    const winPool = outcome === 'YES' ? market.yes_pool : market.no_pool
    const totalPool = market.yes_pool + market.no_pool

    if (winPool === 0) {
      const allRes = await txn.execute({ sql: 'SELECT user_id, coins_bet FROM positions WHERE market_id = ?', args: [marketId] })
      for (const pos of allRes.rows as unknown as { user_id: number; coins_bet: number }[]) {
        await txn.execute({ sql: 'UPDATE users SET balance = balance + ? WHERE id = ?', args: [pos.coins_bet, pos.user_id] })
        await txn.execute({
          sql: `INSERT INTO transactions (user_id, type, amount, market_id, description) VALUES (?, 'refund', ?, ?, 'Market resolved with no winning bets')`,
          args: [pos.user_id, pos.coins_bet, marketId],
        })
      }
    } else {
      const winnersRes = await txn.execute({ sql: 'SELECT user_id, coins_bet FROM positions WHERE market_id = ? AND side = ?', args: [marketId, outcome] })
      for (const pos of winnersRes.rows as unknown as { user_id: number; coins_bet: number }[]) {
        const payout = Math.floor((pos.coins_bet / winPool) * totalPool)
        await txn.execute({ sql: 'UPDATE users SET balance = balance + ? WHERE id = ?', args: [payout, pos.user_id] })
        await txn.execute({
          sql: `INSERT INTO transactions (user_id, type, amount, market_id, description) VALUES (?, 'payout', ?, ?, ?)`,
          args: [pos.user_id, payout, marketId, `Won ${payout} coins - market resolved ${outcome}`],
        })
      }
    }

    await txn.execute({
      sql: `UPDATE markets SET status = 'resolved', outcome = ?, resolved_at = datetime('now'), resolved_by = ?, resolution_notes = ? WHERE id = ?`,
      args: [outcome, resolvedBy ?? null, notes ?? null, marketId],
    })
    await txn.commit()
  } catch (e) {
    await txn.rollback()
    throw e
  }
}

export async function resolveMarketNA(marketId: number, resolvedBy: number, notes: string | null) {
  const txn = await db.transaction('write')
  try {
    const marketRes = await txn.execute({ sql: 'SELECT status FROM markets WHERE id = ?', args: [marketId] })
    const market = marketRes.rows[0] as unknown as { status: string } | undefined
    if (!market) throw new Error('Market not found')
    if (market.status !== 'open' && market.status !== 'pending_resolution') throw new Error('Market is not open')

    const allRes = await txn.execute({ sql: 'SELECT user_id, coins_bet FROM positions WHERE market_id = ?', args: [marketId] })
    for (const pos of allRes.rows as unknown as { user_id: number; coins_bet: number }[]) {
      await txn.execute({ sql: 'UPDATE users SET balance = balance + ? WHERE id = ?', args: [pos.coins_bet, pos.user_id] })
      await txn.execute({
        sql: `INSERT INTO transactions (user_id, type, amount, market_id, description) VALUES (?, 'refund', ?, ?, 'Market cancelled (N/A) - refunded')`,
        args: [pos.user_id, pos.coins_bet, marketId],
      })
    }

    await txn.execute({
      sql: `UPDATE markets SET status = 'resolved', outcome = 'N/A', resolved_at = datetime('now'), resolved_by = ?, resolution_notes = ? WHERE id = ?`,
      args: [resolvedBy, notes || null, marketId],
    })
    await txn.commit()
  } catch (e) {
    await txn.rollback()
    throw e
  }
}

export async function resolveScoreMarket(marketId: number, winningLabel: string, resolvedBy?: number, notes?: string | null) {
  const txn = await db.transaction('write')
  try {
    const marketRes = await txn.execute({ sql: 'SELECT status, market_type FROM markets WHERE id = ?', args: [marketId] })
    const market = marketRes.rows[0] as unknown as { status: string; market_type: string } | undefined
    if (!market) throw new Error('Market not found')
    if (market.status !== 'open' && market.status !== 'pending_resolution') throw new Error('Market is not open')
    if (market.market_type !== 'score' && market.market_type !== 'personal_score') throw new Error('Not a score market')

    const poolsRes = await txn.execute({ sql: 'SELECT label, amount FROM option_pools WHERE market_id = ?', args: [marketId] })
    const pools = poolsRes.rows as unknown as { label: string; amount: number }[]
    const totalPool = pools.reduce((s, p) => s + p.amount, 0)
    const winPool = pools.find(p => p.label === winningLabel)?.amount ?? 0

    if (winPool === 0) {
      const allRes = await txn.execute({ sql: 'SELECT user_id, coins_bet FROM positions WHERE market_id = ?', args: [marketId] })
      for (const pos of allRes.rows as unknown as { user_id: number; coins_bet: number }[]) {
        await txn.execute({ sql: 'UPDATE users SET balance = balance + ? WHERE id = ?', args: [pos.coins_bet, pos.user_id] })
        await txn.execute({
          sql: `INSERT INTO transactions (user_id, type, amount, market_id, description) VALUES (?, 'refund', ?, ?, 'Market resolved with no winning bets')`,
          args: [pos.user_id, pos.coins_bet, marketId],
        })
      }
    } else {
      const winnersRes = await txn.execute({ sql: 'SELECT user_id, coins_bet FROM positions WHERE market_id = ? AND side = ?', args: [marketId, winningLabel] })
      for (const pos of winnersRes.rows as unknown as { user_id: number; coins_bet: number }[]) {
        const payout = Math.floor((pos.coins_bet / winPool) * totalPool)
        await txn.execute({ sql: 'UPDATE users SET balance = balance + ? WHERE id = ?', args: [payout, pos.user_id] })
        await txn.execute({
          sql: `INSERT INTO transactions (user_id, type, amount, market_id, description) VALUES (?, 'payout', ?, ?, ?)`,
          args: [pos.user_id, payout, marketId, `Won ${payout} coins - resolved "${winningLabel}"`],
        })
      }
    }

    await txn.execute({
      sql: `UPDATE markets SET status = 'resolved', outcome = ?, resolved_at = datetime('now'), resolved_by = ?, resolution_notes = ? WHERE id = ?`,
      args: [winningLabel, resolvedBy ?? null, notes ?? null, marketId],
    })
    await txn.commit()
  } catch (e) {
    await txn.rollback()
    throw e
  }
}
