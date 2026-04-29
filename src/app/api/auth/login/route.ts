export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { signToken } from '@/lib/auth'
import { User } from '@/types'

const DISTRICT_URL = 'https://md-mcps-psv.edupoint.com/Service/PXPCommunication.asmx'
const PROXY_BASE = process.env.PROXY_BASE_URL ?? 'https://mcps-markets-api.fizzwizzledazzle.dev'

const escapeXml = (s: string) => s
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;')

const decodeXml = (s: string) => s
  .replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&amp;/g, '&').replace(/&apos;/g, "'")

function buildSoapXml(studentId: string, password: string, methodName: string, paramStr: string): string {
  return `<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body><ProcessWebServiceRequestMultiWeb xmlns="http://edupoint.com/webservices/"><userID>${escapeXml(studentId)}</userID><password>${escapeXml(password)}</password><skipLoginLog>1</skipLoginLog><parent>0</parent><webServiceHandleName>PXPWebServices</webServiceHandleName><methodName>${methodName}</methodName><paramStr>${escapeXml(paramStr)}</paramStr></ProcessWebServiceRequestMultiWeb></soap:Body></soap:Envelope>`
}

// Send SOAP through proxy — proxy handles the MCPS edupointkeyversion cookie
async function callDistrict(studentId: string, password: string, methodName: string, paramStr: string): Promise<string> {
  const xml = buildSoapXml(studentId, password, methodName, paramStr)

  const res = await fetch(`${PROXY_BASE}/fulfillAxios`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: DISTRICT_URL, xml }),
  })

  const data = await res.json() as { status: boolean; response?: string; message?: string }
  console.log('[district] proxy status:', data.status, '| sample:', String(data.response ?? data.message ?? '').slice(0, 300))

  if (!data.status || !data.response) throw new Error(`Proxy error: ${data.message ?? 'no response'}`)

  const result = data.response.match(/<ProcessWebServiceRequestMultiWebResult>([\s\S]*?)<\/ProcessWebServiceRequestMultiWebResult>/)?.[1]
  if (!result) throw new Error('Invalid SOAP response')
  return result
}

async function verifyStudentVue(studentId: string, password: string): Promise<{ valid: boolean; name?: string }> {
  const text = await callDistrict(studentId, password, 'StudentInfo', '<Parms></Parms>')

  console.log('[login] district response sample:', text.slice(0, 300))

  if (text.includes('Invalid user id or password') || text.includes('RT_ERROR')) {
    return { valid: false }
  }

  const decoded = decodeXml(text)
  const name = decoded.match(/<FormattedName>([^<]+)<\/FormattedName>/)?.[1]?.trim()
    ?? decoded.match(/<NickName>([^<]+)<\/NickName>/)?.[1]?.trim()

  console.log('[login] parsed name:', name)
  return { valid: true, name }
}

interface ClassPeriodRaw { period: string; course_title: string; teacher: string; room: string; course_code: string }

function parsePeriodsFromXml(decoded: string): ClassPeriodRaw[] {
  const periods: ClassPeriodRaw[] = []
  const pattern = /<\w+\b([^>]*?\bPeriod="[^"]*"[^>]*?)(?:\/>|>)/g
  let match: RegExpExecArray | null
  while ((match = pattern.exec(decoded)) !== null) {
    const attrs = match[1]
    const get = (name: string) => new RegExp(`\\b${name}="([^"]*?)"`).exec(attrs)?.[1]?.trim() ?? ''
    const period = get('Period')
    const course = get('CourseTitle') || get('CourseName') || get('Course')
    if (period && course && !periods.some(p => p.period === period)) {
      periods.push({
        period,
        course_title: course,
        teacher: get('Teacher') || get('StaffName'),
        room: get('RoomName') || get('Room') || get('RoomNum'),
        course_code: get('CourseCode') || get('SectionCode') || get('CourseNum'),
      })
    }
  }
  return periods
}

async function fetchAndStoreSchedule(studentId: string, password: string, userId: number): Promise<void> {
  try {
    const result = await callDistrict(studentId, password, 'StudentClassList', '<Parms></Parms>')
    const decoded = decodeXml(result)
    console.log('[schedule] raw xml sample:', decoded.slice(0, 500))
    const periods = parsePeriodsFromXml(decoded)
    console.log(`[schedule] found ${periods.length} periods for user ${userId}`)
    if (periods.length === 0) return
    await db.execute({ sql: 'DELETE FROM user_schedule WHERE user_id = ?', args: [userId] })
    for (const p of periods) {
      await db.execute({
        sql: `INSERT INTO user_schedule (user_id, period, course_title, teacher, room, course_code, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
        args: [userId, p.period, p.course_title, p.teacher || null, p.room || null, p.course_code || null],
      })
    }
  } catch (err) {
    console.error('[schedule] fetch failed for user', userId, err)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { username, password, rememberMe } = await request.json()

    if (!username || !password) {
      return NextResponse.json({ error: 'Student ID and password are required' }, { status: 400 })
    }

    const studentId = String(username).trim()
    if (!/(?:^\d{6}$)|(?:^\d{8}$)/.test(studentId)) {
      return NextResponse.json({ error: 'Student ID must be a 6 or 8 digit number' }, { status: 400 })
    }

    // Always verify credentials against StudentVUE — no passwords stored
    let svResult: { valid: boolean; name?: string }
    try {
      svResult = await verifyStudentVue(studentId, password)
    } catch (err) {
      console.error('StudentVUE request failed:', err)
      return NextResponse.json({ error: 'Could not reach StudentVUE. Try again.' }, { status: 503 })
    }

    if (!svResult.valid) {
      return NextResponse.json({ error: 'Invalid student ID or password' }, { status: 401 })
    }

    const adminId = process.env.ADMIN_STUDENT_ID
    const isAdmin = !!(adminId && studentId === adminId)
    const displayName = svResult.name || studentId

    await db.execute({
      sql: `INSERT INTO users (student_id, name, is_admin) VALUES (?, ?, ?)
            ON CONFLICT(student_id) DO UPDATE SET
              name = excluded.name,
              is_admin = CASE WHEN excluded.is_admin = 1 THEN 1 ELSE users.is_admin END`,
      args: [studentId, displayName, isAdmin ? 1 : 0],
    })

    const userRes = await db.execute({ sql: 'SELECT * FROM users WHERE student_id = ?', args: [studentId] })
    const user = userRes.rows[0] as unknown as User

    const bonusRes = await db.execute({
      sql: "SELECT id FROM transactions WHERE user_id = ? AND type = 'signup_bonus'",
      args: [user.id],
    })
    if (!bonusRes.rows[0]) {
      await db.execute({
        sql: `INSERT INTO transactions (user_id, type, amount, description) VALUES (?, 'signup_bonus', 1000, 'Welcome bonus - 1000 coins to start!')`,
        args: [user.id],
      })
    }

    // Fire-and-forget schedule fetch (password used transiently, never stored)
    fetchAndStoreSchedule(studentId, password, Number(user.id)).catch(() => {})

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
      ...(rememberMe ? { maxAge: 60 * 60 * 24 * 30 } : {}),
    })
    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Login failed. Please try again.' }, { status: 500 })
  }
}
