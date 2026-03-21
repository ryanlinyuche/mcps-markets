import { Router } from 'express'
import { z } from 'zod'
import { login } from '../synergy.js'
import { encryptPassword } from '../crypto.js'
import { validate } from '../middleware/validate.js'
import { logger } from '../logger.js'

const router = Router()

const RefreshSchema = z.object({
  credentials: z.object({
    username: z.string().min(1),
    password: z.string().min(1),
    domain: z.string().min(1),
    encrypted: z.boolean().optional(),
    senddata: z.unknown().optional(),
  }),
})

// POST /refresh
// Authenticates a user and returns new session cookies + re-encrypted password
router.post('/refresh', validate(RefreshSchema), async (req, res) => {
  const { credentials } = req.body as z.infer<typeof RefreshSchema>

  try {
    const result = await login({
      username: credentials.username,
      password: credentials.password,
      domain: credentials.domain,
      encrypted: credentials.encrypted ?? false,
    })

    if (!result.success) {
      res.status(401).json({ error: result.error ?? 'Login failed' })
      return
    }

    // Re-encrypt the plain password for the client to store
    const plainPassword = credentials.encrypted
      ? (() => { const { decryptPassword } = require('../crypto.js'); return decryptPassword(credentials.password) })()
      : credentials.password

    res.json({
      cookies: result.cookies,
      cookieString: result.cookieString,
      encryptedPassword: encryptPassword(plainPassword),
    })
  } catch (err) {
    logger.error('/refresh error', { err })
    res.status(500).json({ error: 'Authentication error' })
  }
})

export default router
