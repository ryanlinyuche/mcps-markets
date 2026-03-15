import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const DB_PATH = path.join(process.cwd(), 'data', 'market.db')

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id TEXT NOT NULL UNIQUE,
  name       TEXT NOT NULL,
  balance    INTEGER NOT NULL DEFAULT 1000,
  is_admin   INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS markets (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT NOT NULL,
  description TEXT,
  creator_id  INTEGER NOT NULL REFERENCES users(id),
  status      TEXT NOT NULL DEFAULT 'pending_approval',
  outcome     TEXT,
  yes_pool    INTEGER NOT NULL DEFAULT 0,
  no_pool     INTEGER NOT NULL DEFAULT 0,
  closes_at   TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  resolved_at TEXT
);

CREATE TABLE IF NOT EXISTS positions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id),
  market_id  INTEGER NOT NULL REFERENCES markets(id),
  side       TEXT NOT NULL,
  coins_bet  INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, market_id, side)
);

CREATE TABLE IF NOT EXISTS transactions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id),
  type        TEXT NOT NULL,
  amount      INTEGER NOT NULL,
  market_id   INTEGER REFERENCES markets(id),
  description TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_markets_status ON markets(status);
CREATE INDEX IF NOT EXISTS idx_positions_user ON positions(user_id);
CREATE INDEX IF NOT EXISTS idx_positions_market ON positions(market_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
`

const globalWithDb = global as typeof global & { _db?: Database.Database }

export function getDb(): Database.Database {
  if (!globalWithDb._db) {
    const dir = path.dirname(DB_PATH)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

    globalWithDb._db = new Database(DB_PATH)
    globalWithDb._db.pragma('journal_mode = WAL')
    globalWithDb._db.pragma('foreign_keys = ON')
    globalWithDb._db.exec(SCHEMA)
  }
  return globalWithDb._db
}

// Lazy proxy: db.prepare() etc. only actually open the DB when called
export const db = new Proxy({} as Database.Database, {
  get(_target, prop: string) {
    return (getDb() as unknown as Record<string, unknown>)[prop]
  },
})
