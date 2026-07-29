import { describe, it, expect } from 'vitest'
import request from 'supertest'
import app from '../src/index.js'
import { sanitizePageContent } from '../src/lib/sanitize.js'

describe('XSS Sanitization', () => {
  it('removes script tags', () => {
    const result = sanitizePageContent('<script>alert("xss")</script>Hello')
    expect(result).not.toContain('<script>')
    expect(result).toContain('Hello')
  })

  it('removes on* event handlers', () => {
    const result = sanitizePageContent('<div onload="evil()">text</div>')
    expect(result).not.toContain('onload')
  })

  it('removes javascript: protocol', () => {
    const result = sanitizePageContent('<a href="javascript:evil()">link</a>')
    expect(result).not.toContain('javascript:')
  })

  it('removes iframe tags', () => {
    const result = sanitizePageContent('<iframe src="http://evil.com"></iframe>text')
    expect(result).not.toContain('<iframe')
    expect(result).toContain('text')
  })

  it('removes SVG event handlers', () => {
    const result = sanitizePageContent('<svg onload="alert(1)"><text>hi</text></svg>')
    expect(result).not.toContain('onload')
    expect(result).not.toContain('<svg')
  })

  it('removes case-obfuscated script tags', () => {
    const result = sanitizePageContent('<ScRiPt>alert(1)</ScRiPt>')
    expect(result).not.toMatch(/<script/i)
  })

  it('removes data URI in iframe', () => {
    const result = sanitizePageContent('<iframe src="data:text/html,<script>alert(1)</script>"></iframe>')
    expect(result).not.toContain('<iframe')
    expect(result).not.toContain('data:')
  })

  it('removes embed and object tags', () => {
    const result = sanitizePageContent('<embed src="evil.swf"><object data="evil.swf"></object>')
    expect(result).not.toContain('<embed')
    expect(result).not.toContain('<object')
  })

  it('removes meta refresh redirect', () => {
    const result = sanitizePageContent('<meta http-equiv="refresh" content="0;url=http://evil.com">')
    expect(result).not.toContain('http-equiv')
  })

  it('removes form tags', () => {
    const result = sanitizePageContent('<form action="http://evil.com"><input type="submit"></form>')
    expect(result).not.toContain('<form')
  })

  it('removes link tags with javascript', () => {
    const result = sanitizePageContent('<link rel="stylesheet" href="javascript:alert(1)">')
    expect(result).not.toContain('javascript:')
  })

  it('preserves plain text content', () => {
    const result = sanitizePageContent('Hello **world**')
    expect(result).toContain('Hello')
  })

  it('preserves DokuWiki markup', () => {
    const result = sanitizePageContent('==== Heading ====\n\n**bold** //italic// __underline__')
    expect(result).toContain('====')
    expect(result).toContain('**bold**')
  })
})

describe('API Security Headers', () => {
  it('returns CSP header', async () => {
    const res = await request(app).get('/api/pages')
    expect(res.headers['content-security-policy']).toBeTruthy()
  })

  it('returns X-Content-Type-Options: nosniff', async () => {
    const res = await request(app).get('/api/pages')
    expect(res.headers['x-content-type-options']).toBe('nosniff')
  })

  it('returns X-Frame-Options: DENY', async () => {
    const res = await request(app).get('/api/pages')
    expect(res.headers['x-frame-options']).toBe('DENY')
  })

  it('does not leak x-powered-by', async () => {
    const res = await request(app).get('/api/pages')
    expect(res.headers['x-powered-by']).toBeUndefined()
  })
})

describe('Path Traversal Prevention (via API)', () => {
  let token = ''

  it('gets a token for testing', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'testuser', password: 'testpass123' })
    token = res.body.token
  })

  it('blocks path traversal in GET', async () => {
    const res = await request(app).get('/api/pages/..%2F..%2Fetc%2Fpasswd')
    expect(res.status).toBe(400)
  })

  it('blocks path traversal in POST', async () => {
    const res = await request(app)
      .post('/api/pages/..%2F..%2Fetc%2Fpasswd')
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'test' })
    expect(res.status).toBe(400)
  })
})
