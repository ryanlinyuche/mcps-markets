import { Request, Response, NextFunction } from 'express'
import { config } from '../config.js'

/**
 * Optional API key authentication.
 * If API_KEY is set in env, all requests must include Authorization: Bearer <key>.
 * If not set, this middleware is a no-op.
 */
export function apiKeyAuth(req: Request, res: Response, next: NextFunction): void {
  if (!config.apiKey) { next(); return }

  const authHeader = req.headers.authorization ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''

  if (token !== config.apiKey) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  next()
}
