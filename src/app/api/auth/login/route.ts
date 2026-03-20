export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { signToken } from '@/lib/auth'
import { User } from '@/types'

const DISTRICT_BASE = 'https://md-mcps-psv.edupoint.com'
const LOGIN_URL = `${DISTRICT_BASE}/PXP2_Login_Student.aspx?regenerateSessionId=True`

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
  'Accept-Language': 'en-US,en;q=0.9',
  'sec-ch-ua': '"Google Chrome";v="123", "Not:A-Brand";v="8", "Chromium";v="123"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"macOS"',
}

// Parse Set-Cookie header(s) into a name→value map
function parseSetCookies(res: Response): Record<string, string> {
  const out: Record<string, string> = {}
  const raw = res.headers.get('set-cookie') ?? ''
  if (!raw) return out
  // Split on commas that precede a new cookie name (heuristic safe for ASP.NET cookies)
  const parts = raw.split(/,(?=\s*[A-Za-z_][A-Za-z0-9_.%]*=)/)
  for (const part of parts) {
    const nameVal = part.split(';')[0].trim()
    const eq = nameVal.indexOf('=')
    if (eq > 0) out[nameVal.slice(0, eq).trim()] = nameVal.slice(eq + 1).trim()
  }
  return out
}

function cookieStr(cookies: Record<string, string>): string {
  return Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ')
}

function extractHidden(html: string, name: string): string {
  const m = html.match(new RegExp(`id="${name}"[^>]*value="([^"]*)"`, 'i'))
    ?? html.match(new RegExp(`name="${name}"[^>]*value="([^"]*)"`, 'i'))
    ?? html.match(new RegExp(`value="([^"]*)"[^>]*(?:id|name)="${name}"`, 'i'))
  return m?.[1] ?? ''
}

function extractName(html: string): string | undefined {
  // Various places the StudentVUE portal puts the student name
  const patterns = [
    /"StudentName"\s*:\s*"([^"]+)"/,
    /"FormattedName"\s*:\s*"([^"]+)"/,
    /id="[^"]*StudentName[^"]*"[^>]*>([^<]+)</i,
    /class="[^"]*user-name[^"]*"[^>]*>\s*([^<\s][^<]+?)\s*</i,
    /class="[^"]*student-name[^"]*"[^>]*>([^<]+)</i,
    // Synergy nav often has "Welcome, FirstName LastName"
    /Welcome[,\s]+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)+)/,
    // Title or heading tags with a full name
    /<title>[^|<]*\|\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\s*</,
  ]
  for (const p of patterns) {
    const m = html.match(p)
    if (m?.[1]?.trim()) return m[1].trim()
  }
  return undefined
}

interface LoginResult {
  valid: boolean
  name?: string
  cookies?: Record<string, string>
}

async function verifyStudentVue(studentId: string, password: string): Promise<LoginResult> {
  // ── Step 1: GET login page for ASP.NET tokens + session cookie ──
  const pageRes = await fetch(LOGIN_URL, { headers: BROWSER_HEADERS })
  if (!pageRes.ok) throw new Error(`Login page fetch failed: ${pageRes.status}`)

  const pageHtml = await pageRes.text()
  let cookies = parseSetCookies(pageRes)

  const viewState = extractHidden(pageHtml, '__VIEWSTATE')
  const eventValidation = extractHidden(pageHtml, '__EVENTVALIDATION')
  const viewStateGenerator = extractHidden(pageHtml, '__VIEWSTATEGENERATOR')

  console.log('[login] got login page, cookies:', Object.keys(cookies), '| viewstate:', !!viewState)

  // ── Step 2: POST credentials ──
  const body = new URLSearchParams({
    '__VIEWSTATE': viewState,
    '__EVENTVALIDATION': eventValidation,
    '__VIEWSTATEGENERATOR': viewStateGenerator,
    'ctl00$MainContent$Submit1': 'Login',
    'ctl00$MainContent$username': studentId,
    'ctl00$MainContent$password': password,
  })

  const loginRes = await fetch(LOGIN_URL, {
    method: 'POST',
    headers: {
      ...BROWSER_HEADERS,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': cookieStr(cookies),
      'Referer': LOGIN_URL,
      'Origin': DISTRICT_BASE,
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'same-origin',
      'Sec-Fetch-User': '?1',
      'Sec-Fetch-Dest': 'document',
    },
    body: body.toString(),
    redirect: 'manual',
  })

  cookies = { ...cookies, ...parseSetCookies(loginRes) }
  const location = loginRes.headers.get('location') ?? ''
  console.log('[login] POST status:', loginRes.status, '| location:', location)

  // Failed login → stays on login page (200) or redirects back to it
  if (loginRes.status !== 302 || location.toLowerCase().includes('login')) {
    return { valid: false }
  }

  // ── Step 3: Follow redirect to extract student name ──
  const dashUrl = location.startsWith('http')
    ? location
    : `${DISTRICT_BASE}${location.startsWith('/') ? '' : '/'}${location}`

  const dashRes = await fetch(dashUrl, {
    headers: {
      ...BROWSER_HEADERS,
      'Cookie': cookieStr(cookies),
      'Referer': LOGIN_URL,
    },
    redirect: 'follow',
  })

  cookies = { ...cookies, ...parseSetCookies(dashRes) }
  const dashHtml = await dashRes.text()
  const name = extractName(dashHtml)
  console.log('[login] extracted name:', name, '| dashboard url:', dashUrl)

  return { valid: true, name, cookies }
}

// ── Schedule via PXP2 JSON API ──────────────────────────────────────

interface ClassInfo { period: string; course_title: string; teacher: string; room: string; course_code: string }

async function fetchAndStoreSchedule(
  cookies: Record<string, string>,
  userId: number
): Promise<void> {
  try {
    const cookieHeader = cookieStr(cookies)

    // Get gradebook page to extract school params
    const gbRes = await fetch(`${DISTRICT_BASE}/PXP2_GradeBook.aspx?AGU=0`, {
      headers: { ...BROWSER_HEADERS, 'Cookie': cookieHeader, 'Referer': `${DISTRICT_BASE}/PXP2_LaunchPad.aspx` },
    })
    const gbHtml = await gbRes.text()

    // School/period data is embedded as JSON on line 17 of the HTML (grademelon technique)
    const lines = gbHtml.split('\n')
    let schoolData: { Schools?: Array<{ SchoolID: number; GradingPeriods: Array<{ GU: string; MarkPeriods: Array<{ GU: string }> }> }> } | null = null
    for (const line of lines.slice(10, 30)) {
      const idx = line.indexOf('{')
      if (idx >= 0 && line.includes('Schools')) {
        try { schoolData = JSON.parse(line.slice(idx, line.lastIndexOf('}') + 1)) } catch { /* skip */ }
        if (schoolData) break
      }
    }

    if (!schoolData?.Schools?.[0]) {
      console.log('[schedule] could not parse school data')
      return
    }

    const school = schoolData.Schools[0]
    const period = school.GradingPeriods[0]

    // Fetch class list for the current grading period
    const classRes = await fetch(`${DISTRICT_BASE}/service/PXP2Communication.asmx/GradebookFocusClassInfo`, {
      method: 'POST',
      headers: {
        ...BROWSER_HEADERS,
        'Content-Type': 'application/json; charset=UTF-8',
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'Cookie': cookieHeader,
        'Origin': DISTRICT_BASE,
        'Referer': `${DISTRICT_BASE}/PXP2_GradeBook.aspx?AGU=0`,
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin',
      },
      body: JSON.stringify({ request: { gradingPeriodGU: period.GU, AGU: '0', schoolID: school.SchoolID } }),
    })

    const classJson = await classRes.json() as { d?: { Data?: { Classes?: Array<{ ID: string; Name: string; TeacherName: string }> } } }
    const classes = classJson?.d?.Data?.Classes ?? []
    console.log(`[schedule] found ${classes.length} classes for user ${userId}`)

    if (classes.length === 0) return

    // Map to our schema — period/room not available from this API
    const periods: ClassInfo[] = classes.map((c, i) => ({
      period: String(i + 1),
      course_title: c.Name,
      teacher: c.TeacherName ?? '',
      room: '',
      course_code: c.ID ?? '',
    }))

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

// ── Main handler ─────────────────────────────────────────────────────

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

    let svResult: LoginResult
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

    // Fire-and-forget schedule fetch using the live session cookies
    if (svResult.cookies) {
      fetchAndStoreSchedule(svResult.cookies, Number(user.id)).catch(() => {})
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
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Login failed. Please try again.' }, { status: 500 })
  }
}
