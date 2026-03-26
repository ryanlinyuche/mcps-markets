export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { signToken } from '@/lib/auth'
import { User } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const { studentId, firstName } = await request.json()

    if (!studentId || !firstName) {
      return NextResponse.json({ error: 'Student ID and first name are required' }, { status: 400 })
    }

    const id = String(studentId).trim()
    if (!/(?:^\d{6}$)|(?:^\d{8}$)/.test(id)) {
      return NextResponse.json({ error: 'Student ID must be a 6 or 8 digit number' }, { status: 400 })
    }

    // Look up existing user only — no new accounts via fallback
    const userRes = await db.execute({
      sql: 'SELECT * FROM users WHERE student_id = ?',
      args: [id],
    })

    const user = userRes.rows[0] as unknown as User | undefined
    if (!user) {
      return NextResponse.json({ error: 'No account found with that student ID. Only existing users can use this login.' }, { status: 404 })
    }

    // Match first name (case-insensitive) against the first word of their stored name
    const storedFirst = (user.name ?? '').split(' ')[0].toLowerCase()
    const inputFirst = String(firstName).trim().toLowerCase()
    if (storedFirst !== inputFirst) {
      return NextResponse.json({ error: 'First name does not match our records' }, { status: 401 })
    }

    const token = await signToken({
      sub: String(user.id),
      studentId: user.student_id,
      name: user.name,
      isAdmin: user.is_admin === 1,
    })

    const response = NextResponse.json({
      name: user.name,
      balance: user.balance,
      isAdmin: user.is_admin === 1,
    })
    response.cookies.set('mcps-session', token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    })
    return response
  } catch (error) {
    console.error('Fallback login error:', error)
    return NextResponse.json({ error: 'Login failed. Please try again.' }, { status: 500 })
  }
}
