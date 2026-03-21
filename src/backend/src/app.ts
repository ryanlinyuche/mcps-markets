import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { config } from './config.js'
import { logger } from './logger.js'
import { ipBan } from './middleware/ipBan.js'
import { apiKeyAuth } from './middleware/apiKey.js'
import { getUserCount } from './synergy.js'
import proxyRoutes from './routes/proxy.js'
import authRoutes from './routes/auth.js'
import gradesRoutes from './routes/grades.js'
import studentRoutes from './routes/student.js'

export function createApp() {
  const app = express()

  // Security headers
  app.set('trust proxy', 1) // Trust first proxy (Cloudflare)
  app.use(helmet())
  app.use(cors({ origin: config.nodeEnv === 'production' ? /mcps-markets\.vercel\.app$/ : '*' }))
  app.use(express.json({ limit: '2mb' }))

  // IP ban list
  app.use(ipBan)

  // Health check — MUST be before apiKeyAuth so k8s liveness/readiness probes
  // (which send no Authorization header) don't get 401 and mark the pod unhealthy
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', uptime: Math.floor(process.uptime()), userCount: getUserCount() })
  })

  // Rate limiting
  if (config.rateLimitEnabled) {
    app.use(rateLimit({
      windowMs: config.rateLimitWindowMs,
      max: config.rateLimitMax,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: 'Too many requests, please try again later' },
    }))
  }

  // Optional API key auth for all routes below
  app.use(apiKeyAuth)

  // User count
  app.get('/userCount', (_req, res) => {
    res.type('text').send(`user count is currently: ${getUserCount()}`)
  })

  // Routes
  app.use('/', proxyRoutes)   // /encryptPassword, /fulfillAxios
  app.use('/', authRoutes)    // /refresh
  app.use('/', gradesRoutes)  // /getHomePageGrades, /getAssignments
  app.use('/', studentRoutes) // /getStudentInfo, /getDocuments, /getDocument, /getStudentPhoto

  // 404
  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' })
  })

  // Error handler
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logger.error('Unhandled error', { err: err.message, stack: err.stack })
    res.status(500).json({ error: 'Internal server error' })
  })

  return app
}
