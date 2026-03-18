import { createClient, Client } from '@libsql/client'

let _db: Client | null = null

function getDb(): Client {
  if (!_db) {
    if (!process.env.TURSO_DATABASE_URL) {
      throw new Error('Missing required environment variable: TURSO_DATABASE_URL')
    }
    _db = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    })
  }
  return _db
}

export const db = new Proxy({} as Client, {
  get(_target, prop) {
    return (getDb() as never)[prop]
  },
})
src/instrumentation.ts — change line 2 from:
if (process.env.NEXT_RUNTIME === 'nodejs') {
to:
if (process.env.NEXT_RUNTIME === 'nodejs' && process.env.TURSO_DATABASE_URL) {
next.config.mjs — full file:
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    instrumentationHook: true,
  },
  serverExternalPackages: ['studentvue'],
};

export default nextConfig;
