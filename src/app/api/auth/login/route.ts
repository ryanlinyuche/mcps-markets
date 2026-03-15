import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { signToken } from '@/lib/auth'
import { User } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password required' }, { status: 400 })
    }

    // Dynamically import studentvue (may be ESM)
    const StudentVue = (await import('studentvue')).default

    let client: Awaited<ReturnType<typeof StudentVue.login>>
    try {
      client = await StudentVue.login(
        process.env.STUDENTVUE_DISTRICT_URL || 'https://md-mcps-psv.edupoint.com/',
        { username, password }
      )
    } catch {
      return NextResponse.json({ error: 'Invalid school credentials. Please check your StudentVUE username and password.' }, { status: 401 })
    }

    // Get student info from StudentVUE
    let studentName = username
    let studentId = username

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const info = await client.studentInfo() as any
      const s = info?.student || info
      // Handle both StudentVUE API response formats
      studentName = s?.FormattedName || (s?.name ? `${s.name} ${s.lastName || ''}`.trim() : username)
      studentId = s?.PermID || s?.permID || s?.studentID || username
    } catch {
      // If studentInfo fails, fall back to using username as ID
      studentId = username
    }

    const adminId = process.env.ADMIN_STUDENT_ID
    const isAdmin = adminId && studentId === adminId

    // Upsert user in DB
    db.prepare(`
      INSERT INTO users (student_id, name, is_admin)
      VALUES (?, ?, ?)
      ON CONFLICT(student_id) DO UPDATE SET
        name = excluded.name,
        is_admin = excluded.is_admin
    `).run(studentId, studentName, isAdmin ? 1 : 0)

    const user = db.prepare('SELECT * FROM users WHERE student_id = ?').get(studentId) as User

    // Grant signup bonus if first login (check transactions)
    const hasBonus = db.prepare(
      "SELECT id FROM transactions WHERE user_id = ? AND type = 'signup_bonus'"
    ).get(user.id)

    if (!hasBonus) {
      db.prepare(`
        INSERT INTO transactions (user_id, type, amount, description)
        VALUES (?, 'signup_bonus', 1000, 'Welcome bonus — 1000 coins to start!')
      `).run(user.id)
    }

    const token = await signToken({
      sub: user.id.toString(),
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
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })

    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Login failed. Please try again.' }, { status: 500 })
  }
}
