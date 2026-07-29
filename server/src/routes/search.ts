// SPDX-License-Identifier: GPL-3.0-or-later
import { Router, Response } from 'express'
import { z } from 'zod'
import { search, highlightSnippet } from '../lib/searchIndex.js'
import { readPage } from '../lib/fileHandler.js'
import { getPageGroups, userCanAccess } from '../lib/pageAccess.js'
import { AuthRequest, optionalAuth } from '../middleware/auth.js'
import { getUserAccessInfo } from '../lib/users.js'

const router = Router()

const querySchema = z.object({
  q: z.string().min(1).max(200),
})

router.get('/', optionalAuth, async (req: AuthRequest, res: Response) => {
  const parsed = querySchema.safeParse(req.query)
  if (!parsed.success) {
    res.status(400).json({ error: 'Missing or invalid query parameter "q"' })
    return
  }

  const results = search(parsed.data.q)
  const pagesDir = process.env.PAGES_DIR || '../public/wiki/pages'

  const userInfo = req.username
    ? await getUserAccessInfo(req.username)
    : { isAdmin: false, groups: ['todos'] }

  const enriched = await Promise.all(
    results.map(async (r) => {
      try {
        const pageGroups = await getPageGroups(pagesDir, r.id)
        if (!userInfo.isAdmin && !userCanAccess(userInfo.groups, pageGroups)) return null
        const content = await readPage(pagesDir, r.id)
        return { id: r.id, score: r.score, snippet: highlightSnippet(content, parsed.data.q) }
      } catch {
        return null
      }
    })
  )

  const filtered = enriched.filter((r): r is NonNullable<typeof r> => r !== null)
  res.json({ query: parsed.data.q, results: filtered })
})

export default router
