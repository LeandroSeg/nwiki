import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import app from '../src/index.js'
import { promises as fs } from 'node:fs'
import path from 'node:path'

let token = ''

const pagesDir = () => process.env.PAGES_DIR || './tests/fixtures/pages'

async function deletePageIfExists(id: string) {
  for (const dir of [pagesDir(), path.join(pagesDir(), '_trash')]) {
    try {
      await fs.unlink(path.join(dir, `${id}.txt`))
    } catch { /* ok if not exists */ }
  }
}

describe('Pages API', () => {
  beforeEach(async () => {
    await deletePageIfExists('safecheck')
  })

  it('logs in for write operations', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'testuser', password: 'testpass123' })
    token = res.body.token
    expect(token).toBeTruthy()
  })

  it('GET /api/pages returns a list', async () => {
    const res = await request(app).get('/api/pages')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('pages')
    expect(Array.isArray(res.body.pages)).toBe(true)
  })

  it('GET /api/pages/test returns content', async () => {
    const res = await request(app).get('/api/pages/test')
    expect(res.status).toBe(200)
    expect(res.text).toBeTruthy()
  })

  it('GET /api/pages/nonexistent returns 404', async () => {
    const res = await request(app).get('/api/pages/nonexistent')
    expect(res.status).toBe(404)
  })

  it('POST /api/pages/newpage without token returns 401', async () => {
    const res = await request(app)
      .post('/api/pages/newpage')
      .send({ content: 'test' })
    expect(res.status).toBe(401)
  })

  it('POST /api/pages/newpage with token returns 201', async () => {
    const res = await request(app)
      .post('/api/pages/newpage')
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'new page content' })
    expect(res.status).toBe(201)
  })

  it('POST /api/pages/newpage duplicate returns 409', async () => {
    const res = await request(app)
      .post('/api/pages/newpage')
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'duplicate' })
    expect(res.status).toBe(409)
  })

  it('PUT /api/pages/newpage updates content', async () => {
    const res = await request(app)
      .put('/api/pages/newpage')
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'updated content' })
    expect(res.status).toBe(200)
  })

  it('DELETE /api/pages/newpage without token returns 401', async () => {
    const res = await request(app).delete('/api/pages/newpage')
    expect(res.status).toBe(401)
  })

  it('DELETE /api/pages/newpage with token returns 200', async () => {
    const res = await request(app)
      .delete('/api/pages/newpage')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
  })

  it('POST /api/pages with script tag sanitizes content', async () => {
    const res = await request(app)
      .post('/api/pages/safecheck')
      .set('Authorization', `Bearer ${token}`)
      .send({ content: '<script>alert("xss")</script>Hello' })
    expect(res.status).toBe(201)

    const getRes = await request(app).get('/api/pages/safecheck')
    expect(getRes.text).not.toContain('<script>')
    expect(getRes.text).toContain('Hello')

    await request(app)
      .delete('/api/pages/safecheck')
      .set('Authorization', `Bearer ${token}`)
  })
})
