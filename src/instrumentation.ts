export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
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
      `CREATE INDEX IF NOT EXISTS idx_markets_status ON markets(status)`,
      `CREATE INDEX IF NOT EXISTS idx_positions_user ON positions(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_positions_market ON positions(market_id)`,
      `CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_market_history ON market_history(market_id, recorded_at)`,
    ]

    for (const sql of tables) {
      await db.execute(sql)
    }
  }
}
