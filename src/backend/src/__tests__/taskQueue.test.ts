import { describe, it, expect } from 'vitest'
import { enqueue } from '../taskQueue.js'

describe('taskQueue', () => {
  it('executes a single task', async () => {
    const result = await enqueue('key-1', async () => 42)
    expect(result).toBe(42)
  })

  it('serializes tasks with the same key', async () => {
    const order: number[] = []

    const a = enqueue('serial', async () => {
      await new Promise(r => setTimeout(r, 50))
      order.push(1)
      return 'a'
    })

    const b = enqueue('serial', async () => {
      order.push(2)
      return 'b'
    })

    const [ra, rb] = await Promise.all([a, b])
    expect(ra).toBe('a')
    expect(rb).toBe('b')
    expect(order).toEqual([1, 2])
  })

  it('runs tasks with different keys in parallel', async () => {
    const start = Date.now()

    const a = enqueue('parallel-a', async () => {
      await new Promise(r => setTimeout(r, 50))
      return 'a'
    })

    const b = enqueue('parallel-b', async () => {
      await new Promise(r => setTimeout(r, 50))
      return 'b'
    })

    await Promise.all([a, b])
    const elapsed = Date.now() - start
    // Both should run concurrently, so total < 100ms
    expect(elapsed).toBeLessThan(100)
  })

  it('continues queue after a task rejects', async () => {
    const a = enqueue('fail-key', async () => {
      throw new Error('boom')
    }).catch(() => 'caught')

    const b = enqueue('fail-key', async () => 'recovered')

    const [ra, rb] = await Promise.all([a, b])
    expect(ra).toBe('caught')
    expect(rb).toBe('recovered')
  })
})
