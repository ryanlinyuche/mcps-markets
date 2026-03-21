import axios from 'axios'
import { JSDOM } from 'jsdom'
import { logger } from './logger.js'
import { config } from './config.js'

interface ViewStateEntry {
  viewState: string
  eventValidation: string
  fetchedAt: number
}

const cache = new Map<string, ViewStateEntry>()

/**
 * Parse __VIEWSTATE and __EVENTVALIDATION from a Synergy login page HTML.
 */
export function parseFormData(html: string): { viewState: string; eventValidation: string } {
  const dom = new JSDOM(html)
  const doc = dom.window.document

  const vs = (doc.querySelector('input[name="__VIEWSTATE"]') as HTMLInputElement | null)?.value ?? ''
  const ev = (doc.querySelector('input[name="__EVENTVALIDATION"]') as HTMLInputElement | null)?.value ?? ''

  if (!vs) logger.warn('Could not find __VIEWSTATE in login page')
  if (!ev) logger.warn('Could not find __EVENTVALIDATION in login page')

  return { viewState: vs, eventValidation: ev }
}

/**
 * Fetch fresh ViewState/EventValidation from a Synergy domain.
 */
export async function fetchViewState(domain: string): Promise<ViewStateEntry> {
  const url = `${domain}/PXP2_Login_Student.aspx?regenerateSessionId=True`
  const res = await axios.get<string>(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MCPSMarkets/1.0)' },
    timeout: 15_000,
  })
  const { viewState, eventValidation } = parseFormData(res.data)
  const entry: ViewStateEntry = { viewState, eventValidation, fetchedAt: Date.now() }
  cache.set(domain, entry)
  logger.debug('Fetched ViewState', { domain })
  return entry
}

/**
 * Get cached ViewState for a domain, refreshing if stale.
 */
export async function getViewState(domain: string): Promise<ViewStateEntry> {
  const cached = cache.get(domain)
  if (cached && Date.now() - cached.fetchedAt < config.viewStateTtl) {
    return cached
  }
  return fetchViewState(domain)
}

/**
 * Refresh all cached domains on a schedule.
 */
export function startViewStateRefresh(): NodeJS.Timeout {
  return setInterval(async () => {
    const domains = Array.from(cache.keys())
    for (const domain of domains) {
      try {
        await fetchViewState(domain)
      } catch (err) {
        logger.error('Failed to refresh ViewState', { domain, err })
      }
    }
  }, config.viewStateTtl)
}
