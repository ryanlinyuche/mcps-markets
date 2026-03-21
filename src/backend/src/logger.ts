import winston from 'winston'
import { config } from './config.js'

export const logger = winston.createLogger({
  level: config.nodeEnv === 'production' ? 'info' : 'debug',
  format: config.nodeEnv === 'production'
    ? winston.format.json()
    : winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: 'HH:mm:ss' }),
        winston.format.printf(({ level, message, timestamp, ...meta }) => {
          const extra = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : ''
          return `${timestamp} [${level}] ${message}${extra}`
        })
      ),
  transports: [new winston.transports.Console()],
})
