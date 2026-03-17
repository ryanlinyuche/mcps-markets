import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const DB_PATH = path.join(process.cwd(), 'data', 'market.db')

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id    TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  password_hash TEXT,
  balance       INTEGER NOT NULL DEFAULT 1000,
  is_admin      INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS markets (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  title        TEXT NOT NULL,
  description  TEXT,
  school       TEXT NOT NULL DEFAULT 'Winston Churchill High School',
  market_type  TEXT NOT NULL DEFAULT 'yesno',
  creator_id   INTEGER NOT NULL REFERENCES users(id),
  status       TEXT NOT NULL DEFAULT 'pending_approval',
  outcome      TEXT,
  yes_pool     INTEGER NOT NULL DEFAULT 0,
  no_pool      INTEGER NOT NULL DEFAULT 0,
  closes_at    TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  resolved_at  TEXT
);

CREATE TABLE IF NOT EXISTS option_pools (
  market_id  INTEGER NOT NULL REFERENCES markets(id),
  label      TEXT NOT NULL,
  amount     INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (market_id, label)
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

CREATE TABLE IF NOT EXISTS market_history (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  market_id   INTEGER NOT NULL REFERENCES markets(id),
  yes_pool    INTEGER NOT NULL DEFAULT 0,
  no_pool     INTEGER NOT NULL DEFAULT 0,
  recorded_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS resolution_flags (
  user_id    INTEGER NOT NULL REFERENCES users(id),
  market_id  INTEGER NOT NULL REFERENCES markets(id),
  flagged_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, market_id)
);

CREATE TABLE IF NOT EXISTS user_schedule (
  user_id      INTEGER NOT NULL REFERENCES users(id),
  period       TEXT NOT NULL,
  course_title TEXT NOT NULL,
  teacher      TEXT,
  room         TEXT,
  course_code  TEXT,
  updated_at   TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, period)
);

CREATE INDEX IF NOT EXISTS idx_markets_status ON markets(status);
CREATE INDEX IF NOT EXISTS idx_positions_user ON positions(user_id);
CREATE INDEX IF NOT EXISTS idx_positions_market ON positions(market_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_market_history ON market_history(market_id, recorded_at);
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

    // Migrations for existing DBs
    const userCols = globalWithDb._db.prepare("PRAGMA table_info(users)").all() as { name: string }[]
    if (!userCols.some(c => c.name === 'password_hash')) {
      globalWithDb._db.exec("ALTER TABLE users ADD COLUMN password_hash TEXT")
    }
    const marketCols = globalWithDb._db.prepare("PRAGMA table_info(markets)").all() as { name: string }[]
    if (!marketCols.some(c => c.name === 'school')) {
      globalWithDb._db.exec("ALTER TABLE markets ADD COLUMN school TEXT NOT NULL DEFAULT 'Winston Churchill High School'")
    }
    if (!marketCols.some(c => c.name === 'market_type')) {
      globalWithDb._db.exec("ALTER TABLE markets ADD COLUMN market_type TEXT NOT NULL DEFAULT 'yesno'")
    }
    if (!marketCols.some(c => c.name === 'resolution_criteria')) {
      globalWithDb._db.exec("ALTER TABLE markets ADD COLUMN resolution_criteria TEXT")
    }
    if (!marketCols.some(c => c.name === 'resolution_source')) {
      globalWithDb._db.exec("ALTER TABLE markets ADD COLUMN resolution_source TEXT")
    }
    if (!marketCols.some(c => c.name === 'resolution_notes')) {
      globalWithDb._db.exec("ALTER TABLE markets ADD COLUMN resolution_notes TEXT")
    }
    if (!marketCols.some(c => c.name === 'resolved_by')) {
      globalWithDb._db.exec("ALTER TABLE markets ADD COLUMN resolved_by INTEGER REFERENCES users(id)")
    }
    if (!marketCols.some(c => c.name === 'resolution_proof')) {
      globalWithDb._db.exec("ALTER TABLE markets ADD COLUMN resolution_proof TEXT")
    }
    if (!marketCols.some(c => c.name === 'subject_user_id')) {
      globalWithDb._db.exec("ALTER TABLE markets ADD COLUMN subject_user_id INTEGER REFERENCES users(id)")
    }
    const historyCols = globalWithDb._db.prepare("PRAGMA table_info(market_history)").all() as { name: string }[]
    if (!historyCols.some(c => c.name === 'snapshot')) {
      globalWithDb._db.exec("ALTER TABLE market_history ADD COLUMN snapshot TEXT")
    }
    // Create user_schedule table if it doesn't exist yet (migration for existing DBs)
    const scheduleTableExists = globalWithDb._db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='user_schedule'"
    ).get()
    if (!scheduleTableExists) {
      globalWithDb._db.exec(`
        CREATE TABLE user_schedule (
          user_id      INTEGER NOT NULL REFERENCES users(id),
          period       TEXT NOT NULL,
          course_title TEXT NOT NULL,
          teacher      TEXT,
          room         TEXT,
          course_code  TEXT,
          updated_at   TEXT NOT NULL DEFAULT (datetime('now')),
          PRIMARY KEY (user_id, period)
        )
      `)
    }
    if (!marketCols.some(c => c.name === 'period_class')) {
      globalWithDb._db.exec("ALTER TABLE markets ADD COLUMN period_class TEXT")
    }
    if (!marketCols.some(c => c.name === 'sport')) {
      globalWithDb._db.exec("ALTER TABLE markets ADD COLUMN sport TEXT")
    }
    if (!marketCols.some(c => c.name === 'team_a')) {
      globalWithDb._db.exec("ALTER TABLE markets ADD COLUMN team_a TEXT")
    }
    if (!marketCols.some(c => c.name === 'team_b')) {
      globalWithDb._db.exec("ALTER TABLE markets ADD COLUMN team_b TEXT")
    }
  }
  return globalWithDb._db
}

// Lazy proxy: db.prepare() etc. only actually open the DB when called
export const db = new Proxy({} as Database.Database, {
  get(_target, prop: string) {
    return (getDb() as unknown as Record<string, unknown>)[prop]
  },
})
