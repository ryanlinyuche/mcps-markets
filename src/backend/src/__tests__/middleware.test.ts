import { describe, it, expect } from 'vitest'
import express from 'express'
import request from 'supertest'
import { z } from 'zod'
import { validate } from '../middleware/validate.js'
import { apiKeyAuth } from '../middleware/apiKey.js'
import { ipBan } from '../middleware/ipBan.js'

describe('validate middleware', () => {
  const schema = z.object({ name: z.string().min(1), age: z.number().int().positive() })
  const app = express()
  app.use(express.json())
  app.post('/test', validate(schema), (req, res) => {
    res.json({ ok: true, data: req.body })
  })

  it('passes valid body through', async () => {
    const res = await request(app).post('/test').send({ name: 'Alice', age: 25 })
    expect(res.status).toBe(200)
    expect(res.body.data).toEqual({ name: 'Alice', age: 25 })
  })

  it('rejects invalid body with 400', async () => {
    const res = await request(app).post('/test').send({ name: '', age: -1 })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Validation error')
    expect(res.body).toHaveProperty('details')
  })

  it('rejects missing fields', async () => {
    const res = await request(app).post('/test').send({})
    expect(res.status).toBe(400)
  })

  it('strips extra fields', async () => {
    const res = await request(app).post('/test').send({ name: 'Bob', age: 30, extra: true })
    expect(res.status).toBe(200)
  })
})

describe('apiKeyAuth middleware', () => {
  it('passes when no API_KEY is configured', async () => {
    const app = express()
    app.use(apiKeyAuth)
    app.get('/test', (_req, res) => res.json({ ok: true }))

    const res = await request(app).get('/test')
    expect(res.status).toBe(200)
  })
})

describe('ipBan middleware', () => {
  it('allows non-banned IPs', async () => {
    const app = express()
    app.use(ipBan)
    app.get('/test', (_req, res) => res.json({ ok: true }))

    const res = await request(app).get('/test')
    expect(res.status).toBe(200)
  })
})
