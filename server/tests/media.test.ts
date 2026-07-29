import { describe, it, expect } from 'vitest'
import request from 'supertest'
import app from '../src/index.js'

let token = ''

describe('Media API', () => {
  it('logs in for write operations', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'testuser', password: 'testpass123' })
    token = res.body.token
  })

  it('GET /api/media returns a list', async () => {
    const res = await request(app).get('/api/media')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('files')
  })

  it('POST /api/media without token returns 401', async () => {
    const res = await request(app)
      .post('/api/media')
      .attach('file', Buffer.from('fake'), 'test.txt')
    expect(res.status).toBe(401)
  })
})
