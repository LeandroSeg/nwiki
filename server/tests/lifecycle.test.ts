import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import request from 'supertest'
import app from '../src/index.js'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { addUser } from '../src/lib/users.js'
import { writePage } from '../src/lib/fileHandler.js'

const pagesDir = () => process.env.PAGES_DIR!
let adminToken = ''

async function deletePageIfExists(id: string) {
  for (const dir of [pagesDir(), path.join(pagesDir(), '_trash')]) {
    try {
      await fs.unlink(path.join(dir, `${id}.txt`))
    } catch { /* ok */ }
  }
}

describe('User Approval Flow', () => {
  beforeAll(async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'testuser', password: 'testpass123' })
    adminToken = res.body.token
  })

  it('GET /api/auth/pending lists inactive users', async () => {
    try {
      await addUser('pendinguser', 'pendingpass123')
    } catch { /* already exists */ }
    const res = await request(app)
      .get('/api/auth/pending')
      .set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
    expect(res.body.users.some((u: any) => u.username === 'pendinguser')).toBe(true)
  })

  it('POST /api/auth/approve/:username activates user', async () => {
    const res = await request(app)
      .post('/api/auth/approve/pendinguser')
      .set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(200)

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'pendinguser', password: 'pendingpass123' })
    expect(loginRes.status).toBe(200)
  })
})

describe('Trash and Restore', () => {
  beforeAll(async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'testuser', password: 'testpass123' })
    adminToken = res.body.token
  })

  beforeEach(async () => {
    await deletePageIfExists('trash-test-page')
  })

  it('GET /api/pages/trash/list returns empty initially', async () => {
    const res = await request(app)
      .get('/api/pages/trash/list')
      .set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.pages)).toBe(true)
  })

  it('POST /api/pages/trash/list returns 401 without auth', async () => {
    const res = await request(app).get('/api/pages/trash/list')
    expect(res.status).toBe(401)
  })

  it('trash and restore flow', async () => {
    const createRes = await request(app)
      .post('/api/pages/trash-test-page')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ content: 'to be trashed' })
    expect(createRes.status).toBe(201)

    const delRes = await request(app)
      .delete('/api/pages/trash-test-page')
      .set('Authorization', `Bearer ${adminToken}`)
    expect(delRes.status).toBe(200)
    expect(delRes.body.trashed).toBe(true)

    const restoreRes = await request(app)
      .post('/api/pages/trash/trash-test-page/restore')
      .set('Authorization', `Bearer ${adminToken}`)
    expect(restoreRes.status).toBe(200)

    const getRes = await request(app).get('/api/pages/trash-test-page')
    expect(getRes.status).toBe(200)
  })

  it('DELETE /api/pages/trash/:id permanently deletes', async () => {
    await writePage(pagesDir(), 'trash-test-page', 'to be deleted permanently')

    const delRes = await request(app)
      .delete('/api/pages/trash-test-page')
      .set('Authorization', `Bearer ${adminToken}`)
    expect(delRes.status).toBe(200)

    const permDelRes = await request(app)
      .delete('/api/pages/trash/trash-test-page')
      .set('Authorization', `Bearer ${adminToken}`)
    expect(permDelRes.status).toBe(200)
    expect(permDelRes.body.permanentlyDeleted).toBe(true)

    const restoreRes = await request(app)
      .post('/api/pages/trash/trash-test-page/restore')
      .set('Authorization', `Bearer ${adminToken}`)
    expect(restoreRes.status).toBe(404)
  })
})
