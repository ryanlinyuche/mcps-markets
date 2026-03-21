import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { createApp } from '../app.js'

const app = createApp()

describe('GET /health', () => {
  it('returns 200 with status ok', async () => {
    const res = await request(app).get('/health')
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('ok')
    expect(res.body).toHaveProperty('uptime')
    expect(res.body).toHaveProperty('userCount')
  })
})

describe('404 handler', () => {
  it('returns 404 for unknown routes', async () => {
    const res = await request(app).get('/nonexistent')
    expect(res.status).toBe(404)
    expect(res.body.error).toBe('Not found')
  })
})

describe('POST /encryptPassword', () => {
  it('encrypts a password', async () => {
    const res = await request(app)
      .post('/encryptPassword')
      .send({ password: 'test123' })
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('encryptedPassword')
    expect(res.body.encryptedPassword).not.toBe('test123')
  })

  it('rejects empty password', async () => {
    const res = await request(app)
      .post('/encryptPassword')
      .send({ password: '' })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Validation error')
  })

  it('rejects missing body', async () => {
    const res = await request(app)
      .post('/encryptPassword')
      .send({})
    expect(res.status).toBe(400)
  })
})
