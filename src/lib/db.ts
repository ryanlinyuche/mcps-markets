import { createClient, Client } from '@libsql/client'

function isNetworkError(e: unknown): boolean {
  const code = (e as { cause?: { code?: string }; code?: string })?.cause?.code ?? (e as { code?: string })?.code
  return code === 'ECONNRESET' || code === 'ETIMEDOUT' || code === 'ECONNREFUSED' || code === 'UND_ERR_CONNECT_TIMEOUT'
}

function createFreshClient(): Client {
  if (!process.env.TURSO_DATABASE_URL) {
    throw new Error('Missing required environment variable: TURSO_DATABASE_URL')
  }
  return createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  })
}

let _db: Client | null = null

function getDb(): Client {
  if (!_db) _db = createFreshClient()
  return _db
}

function resetDb(): Client {
  _db = createFreshClient()
  return _db
}

export const db = new Proxy({} as Client, {
  get(_target, prop) {
    const value = (getDb() as never)[prop as string]
    if (typeof value !== 'function') return value

    return async (...args: unknown[]) => {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const client = getDb()
          const fn = (client as never)[prop as string] as (...a: unknown[]) => Promise<unknown>
          return await fn.apply(client, args)
        } catch (e) {
          if (isNetworkError(e) && attempt < 2) {
            // Stale connection — drop it and reconnect
            resetDb()
            await new Promise(r => setTimeout(r, 200 * (attempt + 1)))
            continue
          }
          throw e
        }
      }
    }
  },
})
