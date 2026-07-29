import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'
import app from '../src/index.js'
import { createUser } from '../src/lib/users.js'

describe('POST /api/auth/login', () => {
  beforeAll(async () => {
    await createUser('testuser', 'testpass123')
  })

  it('returns 200 + token for valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'testuser', password: 'testpass123' })
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('token')
  })

  it('returns 401 for invalid password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'testuser', password: 'wrongpass' })
    expect(res.status).toBe(401)
  })

  it('returns 400 for empty body', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({})
    expect(res.status).toBe(400)
  })
})

describe('GET /api/auth/status', () => {
  it('returns hasUsers: true when users exist', async () => {
    const res = await request(app).get('/api/auth/status')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('hasUsers')
    expect(typeof res.body.hasUsers).toBe('boolean')
  })
})

describe('POST /api/auth/setup', () => {
  beforeAll(async () => {
    await createUser('setupuser', 'setuppass123')
  })

  it('returns 409 when users already exist', async () => {
    const res = await request(app)
      .post('/api/auth/setup')
      .send({ username: 'another', password: 'anotherpass123' })
    expect(res.status).toBe(409)
  })
})
