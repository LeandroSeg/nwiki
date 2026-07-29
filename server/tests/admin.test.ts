import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import app from '../src/index.js'
import { addUser } from '../src/lib/users.js'
import { loadConfig } from '../src/lib/config.js'

let adminToken = ''
let userToken = ''
const testGroupId = ''

describe('Admin API', () => {
  beforeAll(async () => {
    const adminRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'testuser', password: 'testpass123' })
    adminToken = adminRes.body.token

    try {
      await addUser('regularuser', 'regularpass123')
    } catch { /* already exists */ }
    const userRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'regularuser', password: 'regularpass123' })
    userToken = userRes.body.token
  })

  describe('Config', () => {
    it('GET /api/admin/config returns config for admin', async () => {
      const res = await request(app)
        .get('/api/admin/config')
        .set('Authorization', `Bearer ${adminToken}`)
      expect(res.status).toBe(200)
      expect(res.body).toHaveProperty('siteName')
    })

    it('GET /api/admin/config returns 401 without token', async () => {
      const res = await request(app).get('/api/admin/config')
      expect(res.status).toBe(401)
    })

    it('GET /api/admin/config returns 403 for non-admin', async () => {
      const res = await request(app)
        .get('/api/admin/config')
        .set('Authorization', `Bearer ${userToken}`)
      expect(res.status).toBe(403)
    })

    it('PUT /api/admin/config updates config', async () => {
      const res = await request(app)
        .put('/api/admin/config')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ siteName: 'updated-name' })
      expect(res.status).toBe(200)
      const cfg = await loadConfig()
      expect(cfg.siteName).toBe('updated-name')

      await request(app)
        .put('/api/admin/config')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ siteName: 'nwiki-test' })
    })

    it('PUT /api/admin/config rejects invalid values', async () => {
      const res = await request(app)
        .put('/api/admin/config')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ defaultFontSize: 10 })
      expect(res.status).toBe(400)
    })
  })

  describe('Users', () => {
    it('GET /api/admin/users lists all users', async () => {
      const res = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
      expect(res.status).toBe(200)
      expect(res.body.users.length).toBeGreaterThanOrEqual(2)
      expect(res.body.users.some((u: any) => u.username === 'regularuser')).toBe(true)
    })

    it('POST /api/admin/users/:username/activate activates user', async () => {
      const res = await request(app)
        .post('/api/admin/users/regularuser/activate')
        .set('Authorization', `Bearer ${adminToken}`)
      expect(res.status).toBe(200)
    })

    it('POST /api/admin/users/:username/deactivate deactivates user', async () => {
      const res = await request(app)
        .post('/api/admin/users/regularuser/deactivate')
        .set('Authorization', `Bearer ${adminToken}`)
      expect(res.status).toBe(200)
    })

    it('POST /api/admin/users/:username/deactivate returns 404 for nonexistent', async () => {
      const res = await request(app)
        .post('/api/admin/users/nonexistentuser/deactivate')
        .set('Authorization', `Bearer ${adminToken}`)
      expect(res.status).toBe(404)
    })

    it('PUT /api/admin/users/:username/role changes role', async () => {
      const res = await request(app)
        .put('/api/admin/users/regularuser/role')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'admin' })
      expect(res.status).toBe(200)

      await request(app)
        .put('/api/admin/users/regularuser/role')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'user' })
    })

    it('PUT /api/admin/users/:username/role rejects invalid role', async () => {
      const res = await request(app)
        .put('/api/admin/users/regularuser/role')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'superadmin' })
      expect(res.status).toBe(400)
    })

    it('PUT /api/admin/users/:username/type changes user type', async () => {
      const res = await request(app)
        .put('/api/admin/users/regularuser/type')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userType: 'A' })
      expect(res.status).toBe(200)
    })

    it('PUT /api/admin/users/:username/groups changes groups', async () => {
      const res = await request(app)
        .put('/api/admin/users/regularuser/groups')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ groups: ['todos', 'admins'] })
      expect(res.status).toBe(200)
    })
  })

  describe('Groups', () => {
    let createdGroupId = ''

    it('GET /api/admin/groups lists groups', async () => {
      const res = await request(app)
        .get('/api/admin/groups')
        .set('Authorization', `Bearer ${adminToken}`)
      expect(res.status).toBe(200)
      expect(res.body.groups).toBeDefined()
      expect(Array.isArray(res.body.groups)).toBe(true)
    })

    it('POST /api/admin/groups creates a new group', async () => {
      const res = await request(app)
        .post('/api/admin/groups')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'test-group' })
      expect(res.status).toBe(201)
      expect(res.body).toHaveProperty('id')
      createdGroupId = res.body.id
    })

    it('PUT /api/admin/groups/:id renames group', async () => {
      if (!createdGroupId) return
      const res = await request(app)
        .put(`/api/admin/groups/${createdGroupId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'renamed-group' })
      expect(res.status).toBe(200)
    })

    it('DELETE /api/admin/groups/:id removes group', async () => {
      if (!createdGroupId) return
      const res = await request(app)
        .delete(`/api/admin/groups/${createdGroupId}`)
        .set('Authorization', `Bearer ${adminToken}`)
      expect(res.status).toBe(200)
    })

    it('DELETE /api/admin/groups/todos returns 400', async () => {
      const res = await request(app)
        .delete('/api/admin/groups/todos')
        .set('Authorization', `Bearer ${adminToken}`)
      expect(res.status).toBe(400)
    })

    it('POST /api/admin/groups without auth returns 401', async () => {
      const res = await request(app)
        .post('/api/admin/groups')
        .send({ name: 'unauth-group' })
      expect(res.status).toBe(401)
    })
  })
})