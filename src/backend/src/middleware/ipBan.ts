import { Request, Response, NextFunction } from 'express'
import { config } from '../config.js'
import { logger } from '../logger.js'

export function ipBan(req: Request, res: Response, next: NextFunction): void {
  const forwarded = req.headers['x-forwarded-for']
  const ip = (typeof forwarded === 'string' ? forwarded.split(',')[0] : req.socket.remoteAddress ?? '').trim()

  if (config.bannedIps.includes(ip)) {
    logger.warn('Blocked banned IP', { ip })
    res.status(405).json({ error: 'Access denied' })
    return
  }
  next()
}
