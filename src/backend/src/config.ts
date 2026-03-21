import dotenv from 'dotenv'
dotenv.config()

function require_env(key: string): string {
  const v = process.env[key]
  if (!v) throw new Error(`Missing required environment variable: ${key}`)
  return v
}

export const config = {
  port: parseInt(process.env.PORT ?? '3000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',

  // AES key used to encrypt/decrypt passwords — must match the front-end
  encryptionKey: require_env('ENCRYPTION_KEY'),

  // Optional: shared API key clients must send as Bearer token
  apiKey: process.env.API_KEY ?? '',

  // IP addresses to block (comma-separated)
  bannedIps: (process.env.BAN_LIST ?? '').split(',').map(s => s.trim()).filter(Boolean),

  // Synergy/StudentVUE district root URL (default to MCPS)
  defaultDistrictUrl: process.env.DEFAULT_DISTRICT_URL ?? 'https://md-mcps-psv.edupoint.com',

  // How long to cache ViewState per domain (ms)
  viewStateTtl: parseInt(process.env.VIEWSTATE_TTL ?? '21600000', 10), // 6 hours

  // Task queue entry TTL (ms)
  taskQueueTtl: parseInt(process.env.TASK_QUEUE_TTL ?? '1800000', 10), // 30 min

  // Rate limiting (set RATE_LIMIT_ENABLED=false to disable)
  rateLimitEnabled: process.env.RATE_LIMIT_ENABLED !== 'false',
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? '900000', 10), // 15 min
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX ?? '200', 10),
}
