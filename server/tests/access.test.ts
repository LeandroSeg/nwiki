import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import request from 'supertest'
import app from '../src/index.js'
import { setPageGroups, clearGroupCache } from '../src/lib/pageAccess.js'
import { writePage, deletePage } from '../src/lib/fileHandler.js'
import { checkLockout, recordAttempt, clearAttempts } from '../src/lib/lockout.js'
import { isBlacklisted, blacklistToken } from '../src/lib/tokenBlacklist.js'

const pagesDir = () => process.env.PAGES_DIR!
const ACL_PAGE = 'acl-test-page'

describe('Page Access Control (ACL)', () => {
  let adminToken = ''

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'testuser', password: 'testpass123' })
    adminToken = res.body.token
    await writePage(pagesDir(), ACL_PAGE, 'ACL test content')
  })

  beforeEach(() => {
    clearGroupCache()
  })

  it('default page access returns todos group', async () => {
    const res = await request(app).get(`/api/pages/${ACL_PAGE}/groups`)
    expect(res.status).toBe(200)
    expect(res.body.groups).toContain('todos')
  })

  it('admin can set page groups', async () => {
    const res = await request(app)
      .put(`/api/pages/${ACL_PAGE}/groups`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ groups: ['admins'] })
    expect(res.status).toBe(200)

    const getRes = await request(app).get(`/api/pages/${ACL_PAGE}/groups`)
    expect(getRes.body.groups).toEqual(['admins'])
  })

  it('non-admin cannot set page groups', async () => {
    const res = await request(app)
      .put(`/api/pages/${ACL_PAGE}/groups`)
      .send({ groups: ['todos'] })
    expect(res.status).toBe(401)
  })

  it('restricted page returns 403 for anonymous user', async () => {
    const res = await request(app).get(`/api/pages/${ACL_PAGE}`)
    expect(res.status).toBe(403)
  })

  it('admin can access restricted page', async () => {
    const res = await request(app)
      .get(`/api/pages/${ACL_PAGE}`)
      .set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
  })

  it('reset page groups to todos', async () => {
    await setPageGroups(pagesDir(), ACL_PAGE, ['todos'])
    const res = await request(app).get(`/api/pages/${ACL_PAGE}/groups`)
    expect(res.body.groups).toContain('todos')
  })
})

describe('Account Lockout', () => {
  const lockUser = 'locktestuser'

  beforeEach(async () => {
    await clearAttempts(lockUser)
  })

  it('returns false for unknown user', async () => {
    const locked = await checkLockout('completelyunknown')
    expect(locked).toBe(false)
  })

  it('locks after 5 failed attempts', async () => {
    for (let i = 0; i < 5; i++) {
      await recordAttempt(lockUser)
    }
    const locked = await checkLockout(lockUser)
    expect(locked).toBe(true)
  })

  it('login returns 429 when locked', async () => {
    for (let i = 0; i < 5; i++) {
      await recordAttempt(lockUser)
    }
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: lockUser, password: 'wrong' })
    expect(res.status).toBe(429)
  })

  it('clearAttempts unlocks account', async () => {
    for (let i = 0; i < 5; i++) {
      await recordAttempt(lockUser)
    }
    await clearAttempts(lockUser)
    const locked = await checkLockout(lockUser)
    expect(locked).toBe(false)
  })
})

describe('Token Blacklist', () => {
  it('isBlacklisted returns false for unknown jti', async () => {
    const result = await isBlacklisted('nonexistent-jti')
    expect(result).toBe(false)
  })

  it('blacklistToken adds jti to blacklist', async () => {
    await blacklistToken('test-jti-123')
    const result = await isBlacklisted('test-jti-123')
    expect(result).toBe(true)
  })
})
