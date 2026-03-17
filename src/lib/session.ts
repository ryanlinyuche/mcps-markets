import { verifyToken } from './auth'
import { cookies } from 'next/headers'

export interface AppSession {
  sub: string
  studentId: string
  name: string
  isAdmin: boolean
}

export async function getSession(): Promise<AppSession | null> {
  const cookieStore = cookies()
  const token = cookieStore.get('mcps-session')?.value
  if (!token) return null

  try {
    const payload = await verifyToken(token)
    return {
      sub: payload.sub,
      studentId: payload.studentId,
      name: payload.name,
      isAdmin: payload.isAdmin,
    }
  } catch {
    return null
  }
}
