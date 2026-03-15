import { cookies } from 'next/headers'
import { verifyToken } from './auth'
import { SessionPayload } from '@/types'

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('mcps-session')?.value
  if (!token) return null
  try {
    return await verifyToken(token)
  } catch {
    return null
  }
}
