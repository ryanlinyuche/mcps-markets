export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs' && process.env.TURSO_DATABASE_URL) {
    const { db } = await import('@/lib/db')

    const tables = [
      `CREATE TABLE IF NOT EXISTS users (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id    TEXT NOT NULL UNIQUE,
        name          TEXT NOT NULL,
        password_hash TEXT,
        balance       INTEGER NOT NULL DEFAULT 1000,
        is_admin      INTEGER NOT NULL DEFAULT 0,
        created_at    TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      `CREATE TABLE IF NOT EXISTS markets (
        id                  INTEGER PRIMARY KEY AUTOINCREMENT,
        title               TEXT NOT NULL,
        description         TEXT,
        school              TEXT NOT NULL DEFAULT 'Winston Churchill High School',
        market_type         TEXT NOT NULL DEFAULT 'yesno',
        creator_id          INTEGER NOT NULL REFERENCES users(id),
        subject_user_id     INTEGER REFERENCES users(id),
        status              TEXT NOT NULL DEFAULT 'pending_approval',
        outcome             TEXT,
        yes_pool            INTEGER NOT NULL DEFAULT 0,
        no_pool             INTEGER NOT NULL DEFAULT 0,
        closes_at           TEXT,
        created_at          TEXT NOT NULL DEFAULT (datetime('now')),
        resolved_at         TEXT,
        resolved_by         INTEGER REFERENCES users(id),
        resolution_criteria TEXT,
        resolution_source   TEXT,
        resolution_notes    TEXT,
        resolution_proof    TEXT,
        period_class        TEXT,
        sport               TEXT,
        team_a              TEXT,
        team_b              TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS option_pools (
        market_id  INTEGER NOT NULL REFERENCES markets(id),
        label      TEXT NOT NULL,
        amount     INTEGER NOT NULL DEFAULT 0,
        sort_order INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (market_id, label)
      )`,
      `CREATE TABLE IF NOT EXISTS positions (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id    INTEGER NOT NULL REFERENCES users(id),
        market_id  INTEGER NOT NULL REFERENCES markets(id),
        side       TEXT NOT NULL,
        coins_bet  INTEGER NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(user_id, market_id, side)
      )`,
      `CREATE TABLE IF NOT EXISTS transactions (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id     INTEGER NOT NULL REFERENCES users(id),
        type        TEXT NOT NULL,
        amount      INTEGER NOT NULL,
        market_id   INTEGER REFERENCES markets(id),
        description TEXT,
        created_at  TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      `CREATE TABLE IF NOT EXISTS market_history (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        market_id   INTEGER NOT NULL REFERENCES markets(id),
        yes_pool    INTEGER NOT NULL DEFAULT 0,
        no_pool     INTEGER NOT NULL DEFAULT 0,
        snapshot    TEXT,
        recorded_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      `CREATE TABLE IF NOT EXISTS resolution_flags (
        user_id    INTEGER NOT NULL REFERENCES users(id),
        market_id  INTEGER NOT NULL REFERENCES markets(id),
        flagged_at TEXT NOT NULL DEFAULT (datetime('now')),
        PRIMARY KEY (user_id, market_id)
      )`,
      `CREATE TABLE IF NOT EXISTS user_schedule (
        user_id      INTEGER NOT NULL REFERENCES users(id),
        period       TEXT NOT NULL,
        course_title TEXT NOT NULL,
        teacher      TEXT,
        room         TEXT,
        course_code  TEXT,
        updated_at   TEXT NOT NULL DEFAULT (datetime('now')),
        PRIMARY KEY (user_id, period)
      )`,
      `CREATE TABLE IF NOT EXISTS monthly_winners (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        year        INTEGER NOT NULL,
        month       INTEGER NOT NULL,
        user_id     INTEGER REFERENCES users(id),
        user_name   TEXT NOT NULL,
        coins       INTEGER NOT NULL,
        recorded_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(year, month)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_markets_status ON markets(status)`,
      `CREATE INDEX IF NOT EXISTS idx_positions_user ON positions(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_positions_market ON positions(market_id)`,
      `CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_market_history ON market_history(market_id, recorded_at)`,
      `CREATE TABLE IF NOT EXISTS notifications (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id    INTEGER NOT NULL REFERENCES users(id),
        type       TEXT NOT NULL,
        market_id  INTEGER REFERENCES markets(id),
        message    TEXT NOT NULL,
        read       INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      `CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read)`,
      `CREATE TABLE IF NOT EXISTS comments (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        market_id  INTEGER NOT NULL REFERENCES markets(id),
        user_id    INTEGER NOT NULL REFERENCES users(id),
        parent_id  INTEGER REFERENCES comments(id),
        content    TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      `CREATE TABLE IF NOT EXISTS comment_likes (
        user_id    INTEGER NOT NULL REFERENCES users(id),
        comment_id INTEGER NOT NULL REFERENCES comments(id),
        PRIMARY KEY (user_id, comment_id)
      )`,
      `CREATE TABLE IF NOT EXISTS featured_markets (
        market_id  INTEGER PRIMARY KEY REFERENCES markets(id),
        sort_order INTEGER NOT NULL DEFAULT 0,
        added_at   TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      `CREATE INDEX IF NOT EXISTS idx_comments_market ON comments(market_id)`,
      `CREATE TABLE IF NOT EXISTS bubbles (
        id               INTEGER PRIMARY KEY AUTOINCREMENT,
        name             TEXT NOT NULL,
        description      TEXT,
        creator_id       INTEGER NOT NULL REFERENCES users(id),
        invite_code      TEXT NOT NULL UNIQUE,
        starting_balance INTEGER NOT NULL DEFAULT 1000,
        created_at       TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      `CREATE TABLE IF NOT EXISTS bubble_members (
        bubble_id  INTEGER NOT NULL REFERENCES bubbles(id) ON DELETE CASCADE,
        user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        balance    INTEGER NOT NULL,
        role       TEXT NOT NULL DEFAULT 'member',
        joined_at  TEXT NOT NULL DEFAULT (datetime('now')),
        PRIMARY KEY (bubble_id, user_id)
      )`,
      `CREATE TABLE IF NOT EXISTS bubble_join_requests (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        bubble_id  INTEGER NOT NULL REFERENCES bubbles(id) ON DELETE CASCADE,
        user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status     TEXT NOT NULL DEFAULT 'pending',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE (bubble_id, user_id)
      )`,
    ]

    for (const sql of tables) {
      await db.execute(sql)
    }

    // Add columns for creator resolution request flow (ignore if already exist)
    const alterStatements = [
      `ALTER TABLE markets ADD COLUMN pending_outcome TEXT`,
      `ALTER TABLE markets ADD COLUMN resolution_requested_by INTEGER REFERENCES users(id)`,
      `ALTER TABLE users ADD COLUMN last_active_at TEXT`,
      `ALTER TABLE users ADD COLUMN rules_accepted_at TEXT`,
      `ALTER TABLE markets ADD COLUMN score_subtype TEXT`,
      `ALTER TABLE markets ADD COLUMN score_threshold INTEGER`,
      `ALTER TABLE users ADD COLUMN comments_banned INTEGER DEFAULT 0`,
      `ALTER TABLE markets ADD COLUMN comments_restricted INTEGER DEFAULT 0`,
      `ALTER TABLE markets ADD COLUMN bubble_id INTEGER REFERENCES bubbles(id)`,
      `ALTER TABLE transactions ADD COLUMN bubble_id INTEGER REFERENCES bubbles(id)`,
    ]
    for (const sql of alterStatements) {
      try { await db.execute(sql) } catch { /* column already exists */ }
    }

    // One-time: reset inactive users (no bets ever) back to 1000 coins
    await db.execute({
      sql: `UPDATE users SET balance = 1000
            WHERE NOT EXISTS (SELECT 1 FROM positions p WHERE p.user_id = users.id)
              AND balance != 1000`,
      args: [],
    })
  }
}
