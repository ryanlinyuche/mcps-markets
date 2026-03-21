import { createApp } from './app.js'
import { config } from './config.js'
import { logger } from './logger.js'
import { startViewStateRefresh } from './viewstate.js'
import { startQueueMaintenance } from './taskQueue.js'
import { resetUserCount } from './synergy.js'

async function main() {
  const app = createApp()

  // Background tasks
  const viewStateTimer = startViewStateRefresh()
  const queueTimer = startQueueMaintenance()
  const userCountTimer = setInterval(resetUserCount, 24 * 60 * 60 * 1000)

  const server = app.listen(config.port, () => {
    logger.info('MCPS Markets Backend running', {
      port: config.port,
      env: config.nodeEnv,
    })
  })

  // Graceful shutdown
  function shutdown(signal: string) {
    logger.info(`Received ${signal}, shutting down gracefully`)
    clearInterval(viewStateTimer)
    clearInterval(queueTimer)
    clearInterval(userCountTimer)
    server.close(() => {
      logger.info('Server closed')
      process.exit(0)
    })
    setTimeout(() => { logger.error('Forced shutdown'); process.exit(1) }, 10_000)
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT',  () => shutdown('SIGINT'))
}

main().catch(err => {
  console.error('Fatal startup error:', err)
  process.exit(1)
})
