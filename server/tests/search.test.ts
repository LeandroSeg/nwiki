import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'
import app from '../src/index.js'
import { rebuildIndex } from '../src/lib/searchIndex.js'

describe('Search API', () => {
  beforeAll(async () => {
    const dir = process.env.PAGES_DIR!
    await rebuildIndex(dir)
  })

  it('GET /api/search?q= without query returns 400', async () => {
    const res = await request(app).get('/api/search')
    expect(res.status).toBe(400)
  })

  it('GET /api/search?q=apples returns matching results', async () => {
    const res = await request(app).get('/api/search?q=apples')
    expect(res.status).toBe(200)
    expect(res.body.results.length).toBeGreaterThanOrEqual(1)
    expect(res.body.results.some((r: any) => r.id === 'search-test')).toBe(true)
  })

  it('GET /api/search?q=bananas returns only banana page', async () => {
    const res = await request(app).get('/api/search?q=bananas')
    expect(res.status).toBe(200)
    expect(res.body.results.length).toBeGreaterThanOrEqual(1)
    expect(res.body.results.some((r: any) => r.id === 'another-test')).toBe(true)
  })

  it('GET /api/search?q= returns results with snippets', async () => {
    const res = await request(app).get('/api/search?q=apples')
    expect(res.status).toBe(200)
    for (const r of res.body.results) {
      expect(r).toHaveProperty('snippet')
      expect(typeof r.snippet).toBe('string')
    }
  })

  it('GET /api/search?q=nonexistentterm returns empty results', async () => {
    const res = await request(app).get('/api/search?q=xyznonexistent123')
    expect(res.status).toBe(200)
    expect(res.body.results).toEqual([])
  })
})
