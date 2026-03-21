import axios from 'axios'
import { wrapper } from 'axios-cookiejar-support'
import { CookieJar } from 'tough-cookie'
import { getViewState } from './viewstate.js'
import { decryptPassword } from './crypto.js'
import { logger } from './logger.js'
import { sha256 } from './crypto.js'

wrapper(axios)

// Anonymous user tracking (daily reset)
const userSet = new Set<string>()
export function trackUser(username: string): void { userSet.add(sha256(username)) }
export function getUserCount(): number { return userSet.size }
export function resetUserCount(): void {
  logger.info('Daily user count', { count: userSet.size })
  userSet.clear()
}

export interface SynergyCredentials {
  username: string
  password: string       // may be encrypted — pass encrypted: true
  domain: string
  encrypted?: boolean
  senddata?: unknown
}

export interface LoginResult {
  success: boolean
  cookies: string[]
  cookieString: string
  error?: string
}

/**
 * Resolve a domain string — strip trailing slash, add https if needed.
 */
function normalizeDomain(raw: string): string {
  let d = raw.trim().replace(/\/$/, '')
  if (!d.startsWith('http')) d = `https://${d}`
  return d
}

/**
 * Authenticate a student against a Synergy portal.
 * Returns session cookies on success.
 */
export async function login(creds: SynergyCredentials): Promise<LoginResult> {
  const domain = normalizeDomain(creds.domain)
  const password = creds.encrypted ? decryptPassword(creds.password) : creds.password

  const jar = new CookieJar()
  const client = axios.create({ jar, withCredentials: true, timeout: 20_000 } as never)

  const vs = await getViewState(domain)

  const params = new URLSearchParams({
    '__VIEWSTATE': vs.viewState,
    '__EVENTVALIDATION': vs.eventValidation,
    'ctl00$MainContent$username': creds.username,
    'ctl00$MainContent$password': password,
    'ctl00$MainContent$Submit1': 'Login',
  })

  const res = await client.post<string>(
    `${domain}/PXP2_Login_Student.aspx?regenerateSessionId=True`,
    params.toString(),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (compatible; MCPSMarkets/1.0)',
      },
      maxRedirects: 5,
    }
  )

  const body = res.data as string
  if (body.includes('Invalid') || body.includes('incorrect')) {
    return { success: false, cookies: [], cookieString: '', error: 'Invalid credentials' }
  }
  if (!body.includes('Good') && body.includes('upgraded')) {
    return { success: false, cookies: [], cookieString: '', error: 'Synergy server requires update' }
  }

  // Extract cookies
  const raw = await jar.getCookies(domain)
  const cookies = raw.map(c => `${c.key}=${c.value}`)

  if (cookies.length === 0) {
    return { success: false, cookies: [], cookieString: '', error: 'No session cookies returned' }
  }

  // Match original format: "PVUE=ENG; {cookie[0]}; {cookie[2]}"
  const cookieString = `PVUE=ENG; ${cookies[0] ?? ''}; ${cookies[2] ?? cookies[0] ?? ''}`

  trackUser(creds.username)
  logger.debug('Login success', { domain, username: creds.username })

  return { success: true, cookies, cookieString }
}

/**
 * Fetch a Synergy page using session cookies, returning the raw HTML.
 */
export async function fetchPage(domain: string, path: string, cookies: string): Promise<string> {
  const url = `${normalizeDomain(domain)}/${path}`
  const res = await axios.get<string>(url, {
    headers: {
      Cookie: cookies,
      'User-Agent': 'Mozilla/5.0 (compatible; MCPSMarkets/1.0)',
    },
    timeout: 20_000,
  })
  return res.data
}

/**
 * Get assignments for a class.
 * Makes 3 sequential API calls as per the original backend.
 */
export async function getAssignments(
  domain: string, cookies: string, senddata: unknown
): Promise<[unknown, unknown]> {
  const base = normalizeDomain(domain)
  const headers = {
    Cookie: cookies,
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (compatible; MCPSMarkets/1.0)',
  }

  // 1. Load control
  await axios.post(
    `${base}/service/PXP2Communication.asmx/LoadControl`,
    { request: senddata },
    { headers, timeout: 20_000 }
  )

  // 2. Get class data
  const r2 = await axios.post(
    `${base}/api/GB/ClientSideData/Transfer?action=genericdata.classdata-GetClassData`,
    {},
    { headers, timeout: 20_000 }
  )

  // 3. Get course content items (assignments)
  const r3 = await axios.post(
    `${base}/api/GB/ClientSideData/Transfer?action=pxp.course.content.items-LoadWithOptions`,
    {
      sorts: [{ expression: 'GradingPeriodTitle', direction: 0 }],
      filters: [{ expression: 'IsDropped', operator: '=', value: 'N' }],
      group: { expression: 'GradingPeriodTitle', direction: 0 },
    },
    { headers, timeout: 20_000 }
  )

  return [r3.data, r2.data]
}
