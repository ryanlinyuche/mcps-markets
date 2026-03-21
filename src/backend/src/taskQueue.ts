import { logger } from './logger.js'
import { config } from './config.js'

interface QueueEntry {
  promise: Promise<unknown>
  createdAt: number
}

const queue = new Map<string, QueueEntry>()

/**
 * Enqueue a task keyed by session cookie.
 * Concurrent requests with the same key are chained, preventing race conditions.
 */
export function enqueue<T>(key: string, task: () => Promise<T>): Promise<T> {
  const existing = queue.get(key)

  let chained: Promise<T>
  if (existing && Date.now() - existing.createdAt < config.taskQueueTtl) {
    // Chain after the existing promise, ignoring its result/error
    chained = existing.promise.then(() => task(), () => task())
  } else {
    chained = task()
  }

  queue.set(key, { promise: chained as Promise<unknown>, createdAt: Date.now() })
  return chained
}

/**
 * Purge stale queue entries. Call on a schedule.
 */
export function purgeStaleEntries(): void {
  const now = Date.now()
  let purged = 0
  for (const [key, entry] of queue.entries()) {
    if (now - entry.createdAt > config.taskQueueTtl) {
      queue.delete(key)
      purged++
    }
  }
  if (purged > 0) logger.debug('Purged stale task queue entries', { purged })
}

export function startQueueMaintenance(): NodeJS.Timeout {
  return setInterval(purgeStaleEntries, config.taskQueueTtl)
}
