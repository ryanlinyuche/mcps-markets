import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { signToken } from '@/lib/auth'
import { User } from '@/types'

const DISTRICT_URL = 'https://md-mcps-psv.edupoint.com/Service/PXPCommunication.asmx'
// MCPS's StudentVUE server blocks direct requests (UPD5304-00) but accepts requests
// from Railway-hosted servers. We route through a Railway proxy that forwards to MCPS.
const PROXY_URL = 'https://studentvuelibtest.up.railway.app/fulfillAxios'

const escapeXml = (s: string) => s
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;')

function buildSoapXml(studentId: string, password: string, methodName: string, paramStr: string): string {
  return `<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body><ProcessWebServiceRequestMultiWeb xmlns="http://edupoint.com/webservices/"><userID>${escapeXml(studentId)}</userID><password>${escapeXml(password)}</password><skipLoginLog>1</skipLoginLog><parent>0</parent><webServiceHandleName>PXPWebServices</webServiceHandleName><methodName>${methodName}</methodName><paramStr>${escapeXml(paramStr)}</paramStr></ProcessWebServiceRequestMultiWeb></soap:Body></soap:Envelope>`
}

async function verifyStudentVue(studentId: string, password: string): Promise<{ valid: boolean; name?: string }> {
  const xml = buildSoapXml(studentId, password, 'StudentInfo', '<Parms></Parms>')

  const res = await fetch(PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: DISTRICT_URL, xml }),
  })

  if (!res.ok) throw new Error(`Proxy returned ${res.status}`)

  const json = await res.json() as { status: boolean; response?: string; message?: string }

  if (!json.status || !json.response) {
    throw new Error(json.message || 'Proxy error')
  }

  const text = json.response

  // Bad credentials
  if (text.includes('Invalid user id or password') || text.includes('RT_ERROR')) {
    return { valid: false }
  }

  // The inner XML is HTML-encoded inside the SOAP envelope — decode it first
  const decoded = text
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&apos;/g, "'")

  // Log a snippet of the decoded XML to help debug name extraction
  // Extract student name — FormattedName is a child element, not an attribute
  const name = decoded.match(/<FormattedName>([^<]+)<\/FormattedName>/)?.[1]?.trim() ||
               decoded.match(/<NickName>([^<]+)<\/NickName>/)?.[1]?.trim()

  return { valid: true, name }
}

interface ClassPeriodRaw { period: string; course_title: string; teacher: string; room: string; course_code: string }

function decodeXml(s: string) {
  return s.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&apos;/g, "'")
}

function parsePeriodsFromXml(decoded: string): ClassPeriodRaw[] {
  const periods: ClassPeriodRaw[] = []
  // Match any element that has a Period attribute and a CourseTitle attribute
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
    // Gradebook reliably returns <Course> elements with Period, Title, StaffName, Room
    const xml = buildSoapXml(studentId, password, 'Gradebook', '<Parms><ReportPeriod></ReportPeriod></Parms>')
    const res = await fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: DISTRICT_URL, xml }),
    })
    if (!res.ok) { console.log('[schedule] proxy error', res.status); return }
    const json = await res.json() as { status: boolean; response?: string }
    if (!json.status || !json.response) { console.log('[schedule] no response'); return }

    const decoded = decodeXml(json.response)
    console.log('[schedule] snippet:', decoded.slice(0, 600))

    const periods = parsePeriodsFromXml(decoded)
    console.log(`[schedule] found ${periods.length} periods for user ${userId}`)
    if (periods.length === 0) { console.log('[schedule] no periods parsed'); return }

    const upsert = db.prepare(`
      INSERT INTO user_schedule (user_id, period, course_title, teacher, room, course_code, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(user_id, period) DO UPDATE SET
        course_title = excluded.course_title,
        teacher = excluded.teacher,
        room = excluded.room,
        course_code = excluded.course_code,
        updated_at = excluded.updated_at
    `)
    for (const p of periods) {
      upsert.run(userId, p.period, p.course_title, p.teacher || null, p.room || null, p.course_code || null)
    }
  } catch (err) {
    console.error('[schedule] fetch failed for user', userId, err)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json({ error: 'Student ID and password are required' }, { status: 400 })
    }

    const studentId = String(username).trim()

    if (!/^\d{6,7}$/.test(studentId)) {
      return NextResponse.json({ error: 'Student ID must be a 6 or 7 digit number' }, { status: 400 })
    }

    // Verify against StudentVUE
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

    // Upsert user — no password stored, StudentVUE is the source of truth
    const displayName = svResult.name || studentId
    db.prepare(`
      INSERT INTO users (student_id, name, is_admin)
      VALUES (?, ?, ?)
      ON CONFLICT(student_id) DO UPDATE SET
        name = excluded.name,
        is_admin = CASE WHEN excluded.is_admin = 1 THEN 1 ELSE users.is_admin END
    `).run(studentId, displayName, isAdmin ? 1 : 0)

    const user = db.prepare('SELECT * FROM users WHERE student_id = ?').get(studentId) as User

    // One-time signup bonus
    const hasBonus = db.prepare(
      "SELECT id FROM transactions WHERE user_id = ? AND type = 'signup_bonus'"
    ).get(user.id)

    if (!hasBonus) {
      db.prepare(`
        INSERT INTO transactions (user_id, type, amount, description)
        VALUES (?, 'signup_bonus', 1000, 'Welcome bonus — 1000 coins to start!')
      `).run(user.id)
    }

    // Fire-and-forget schedule fetch — doesn't delay login
    fetchAndStoreSchedule(studentId, password, user.id).catch(() => {})

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
      maxAge: 60 * 60 * 24 * 7,
    })
    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Login failed. Please try again.' }, { status: 500 })
  }
}
