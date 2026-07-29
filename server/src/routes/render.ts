// SPDX-License-Identifier: GPL-3.0-or-later
import { Router, Response } from 'express'
import path from 'node:path'
import { z } from 'zod'
import { readPage } from '../lib/fileHandler.js'
import { renderDokuWiki } from '../lib/dokuwiki.js'
import { requireAuth, AuthRequest, optionalAuth } from '../middleware/auth.js'
import { getPageGroups, userCanAccess } from '../lib/pageAccess.js'
import { getUserAccessInfo, isAdmin } from '../lib/users.js'
import { getCachedRender, setCachedRender } from '../lib/renderCache.js'
import { wildcardParam } from '../lib/params.js'

const router = Router()
const pagesDir = () => process.env.PAGES_DIR || '../public/wiki/pages'
const trashDir = () => process.env.TRASH_DIR || path.join(pagesDir(), '_trash')

const idSchema = z.string().min(1).max(200)

// Render trashed page content (admin only) — must be before /*id catch-all
router.get('/trash/*id', requireAuth, async (req: AuthRequest, res: Response) => {
  const pageId = wildcardParam(req, 'id')
  const parsed = idSchema.safeParse(pageId)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid page ID' })
    return
  }
  if (!(await isAdmin(req.username!))) {
    res.status(403).json({ error: 'Only administrators can access trashed pages' })
    return
  }
  try {
    const content = await readPage(trashDir(), parsed.data)
    const html = renderDokuWiki(content)
    res.type('text/html').send(html)
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      res.status(404).json({ error: 'Trashed page not found' })
    } else {
      res.status(500).json({ error: 'Failed to render trashed page' })
    }
  }
})

// Render arbitrary markup via POST (for editor preview)
router.post('/', requireAuth, (req: AuthRequest, res: Response) => {
  const { markup } = req.body
  if (typeof markup !== 'string') {
    res.status(400).json({ error: 'markup field is required' })
    return
  }
  const html = renderDokuWiki(markup)
  res.json({ html })
})

router.get('/*id', optionalAuth, async (req: AuthRequest, res: Response) => {
  const pageId = wildcardParam(req, 'id').toLowerCase()
  const t1 = Date.now()
  const parsed = idSchema.safeParse(pageId)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid page ID' })
    return
  }
  try {
    const [pageGroups, userInfo] = await Promise.all([
      getPageGroups(pagesDir(), parsed.data),
      req.username ? getUserAccessInfo(req.username) : Promise.resolve({ isAdmin: false, groups: ['todos'] }),
    ])

    if (!userInfo.isAdmin && !userCanAccess(userInfo.groups, pageGroups)) {
      res.status(403).json({ error: 'You do not have access to this page' })
      return
    }

    const cached = getCachedRender(parsed.data)
    if (cached) {
      const t2 = Date.now()
      if (t2 - t1 > 50) console.log(`[perf] render ${parsed.data}: ${t2 - t1}ms (cache hit)`)
      res.type('text/html').send(cached)
      return
    }

    const content = await readPage(pagesDir(), parsed.data)
    const t2 = Date.now()
    const html = renderDokuWiki(content)
    const t3 = Date.now()
    await setCachedRender(parsed.data, html)
    console.log(`[perf] render ${parsed.data}: read=${t2 - t1}ms parse=${t3 - t2}ms cache_write=${Date.now() - t3}ms total=${Date.now() - t1}ms`)
    res.type('text/html').send(html)
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      res.status(404).json({ error: 'Page not found' })
    } else if (err.message === 'Path traversal detected' || err.message === 'Path too deep') {
      res.status(400).json({ error: err.message })
    } else {
      res.status(500).json({ error: 'Failed to render page' })
    }
  }
})

export default router
