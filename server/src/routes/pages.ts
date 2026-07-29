// SPDX-License-Identifier: GPL-3.0-or-later
import { Router, Response } from 'express'
import path from 'node:path'
import { z } from 'zod'
import { requireAuth, optionalAuth, AuthRequest } from '../middleware/auth.js'
import { readPage, writePage, deletePage, listPages, trashPage, restorePage, listTrash } from '../lib/fileHandler.js'
import { sanitizePageContent } from '../lib/sanitize.js'
import { addToIndex, updateIndex, removeFromIndex } from '../lib/searchIndex.js'
import { getPageGroups, setPageGroups, userCanAccess } from '../lib/pageAccess.js'
import { getDefaultGroupId } from '../lib/groups.js'
import { invalidateRenderCache } from '../lib/renderCache.js'
import { isAdmin, getUserAccessInfo } from '../lib/users.js'
import { wildcardParam } from '../lib/params.js'

const router = Router()
const pagesDir = () => process.env.PAGES_DIR || '../public/wiki/pages'
const MAX_CONTENT_BYTES = 500 * 1024 // 500KB

const idSchema = z.string().min(1).max(200)

// List all pages
router.get('/', async (_req, res: Response) => {
  try {
    const pages = await listPages(pagesDir())
    res.json({ pages })
  } catch {
    res.status(500).json({ error: 'Failed to list pages' })
  }
})

// List trashed pages (auth required) — must be before /*id catch-all
router.get('/trash/list', requireAuth, async (req: AuthRequest, res: Response) => {
  if (!(await isAdmin(req.username!))) {
    res.status(403).json({ error: 'Only administrators can list trashed pages' })
    return
  }
  try {
    const pages = await listTrash(pagesDir())
    res.json({ pages })
  } catch {
    res.status(500).json({ error: 'Failed to list trash' })
  }
})

// Restore a trashed page (admin only) — must be before /*id catch-all
router.post('/trash/*id/restore', requireAuth, async (req: AuthRequest, res: Response) => {
  if (!(await isAdmin(req.username!))) {
    res.status(403).json({ error: 'Only administrators can restore pages' })
    return
  }
  const pageId = wildcardParam(req, 'id').toLowerCase()
  const parsed = idSchema.safeParse(pageId)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid page ID' })
    return
  }
  try {
    await restorePage(pagesDir(), parsed.data)
    const content = await readPage(pagesDir(), parsed.data)
    await addToIndex(parsed.data, content)
    await invalidateRenderCache(parsed.data)
    res.json({ success: true, restored: true })
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      res.status(404).json({ error: 'Trashed page not found' })
    } else {
      res.status(500).json({ error: 'Failed to restore page' })
    }
  }
})

// Permanently delete a trashed page (admin only) — must be before /*id catch-all
router.delete('/trash/*id', requireAuth, async (req: AuthRequest, res: Response) => {
  if (!(await isAdmin(req.username!))) {
    res.status(403).json({ error: 'Only administrators can permanently delete pages' })
    return
  }
  const pagesDirTrash = process.env.TRASH_DIR || path.join(pagesDir(), '_trash')
  const pageId = wildcardParam(req, 'id').toLowerCase()
  const parsed = idSchema.safeParse(pageId)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid page ID' })
    return
  }
  try {
    await deletePage(pagesDirTrash, parsed.data)
    res.json({ success: true, permanentlyDeleted: true })
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      res.status(404).json({ error: 'Trashed page not found' })
    } else {
      res.status(500).json({ error: 'Failed to permanently delete page' })
    }
  }
})

// Read page groups (public, returns which groups can access)
router.get('/*id/groups', optionalAuth, async (req: AuthRequest, res: Response) => {
  const pageId = wildcardParam(req, 'id').toLowerCase()
  const groups = await getPageGroups(pagesDir(), pageId)
  res.json({ pageId, groups })
})

// Update page groups (admin only)
router.put('/*id/groups', requireAuth, async (req: AuthRequest, res: Response) => {
  const pageId = wildcardParam(req, 'id').toLowerCase()
  if (!(await isAdmin(req.username!))) {
    res.status(403).json({ error: 'Only administrators can manage page access' })
    return
  }
  const schema = z.object({ groups: z.array(z.string()) })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: 'Invalid groups' }); return }
  await setPageGroups(pagesDir(), pageId, parsed.data.groups)
  res.json({ success: true })
})

// Read a page
router.get('/*id', optionalAuth, async (req: AuthRequest, res: Response) => {
  const pageId = wildcardParam(req, 'id').toLowerCase()
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

    const content = await readPage(pagesDir(), parsed.data)
    res.type('text/plain').send(content)
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      res.status(404).json({ error: 'Page not found' })
    } else if (err.message === 'Path traversal detected' || err.message === 'Path too deep') {
      res.status(400).json({ error: err.message })
    } else {
      res.status(500).json({ error: 'Failed to read page' })
    }
  }
})

// Create a page
router.post('/*id', requireAuth, async (req: AuthRequest, res: Response) => {
  const pageId = wildcardParam(req, 'id').toLowerCase()
  const parsed = idSchema.safeParse(pageId)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid page ID' })
    return
  }
  const bodySchema = z.object({
    content: z.string().max(MAX_CONTENT_BYTES),
  })
  const body = bodySchema.safeParse(req.body)
  if (!body.success) {
    res.status(400).json({ error: 'Invalid body' })
    return
  }
  try {
    await readPage(pagesDir(), parsed.data)
    res.status(409).json({ error: 'Page already exists' })
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      // Inherit access groups from parent page if it exists
      const parentId = parsed.data.includes('/') ? parsed.data.slice(0, parsed.data.lastIndexOf('/')) : ''
      if (parentId) {
        try {
          await readPage(pagesDir(), parentId)
          const parentGroups = await getPageGroups(pagesDir(), parentId)
          if (parentGroups.length > 0 && !(parentGroups.length === 1 && parentGroups[0] === getDefaultGroupId())) {
            await setPageGroups(pagesDir(), parsed.data, parentGroups)
          }
        } catch { /* parent doesn't exist or has no groups - use default */ }
      }

      const sanitized = sanitizePageContent(body.data.content)
      await writePage(pagesDir(), parsed.data, sanitized)
      await addToIndex(parsed.data, sanitized)
      await invalidateRenderCache(parsed.data)
      res.status(201).json({ success: true })
    } else if (err.message === 'Path traversal detected' || err.message === 'Path too deep') {
      res.status(400).json({ error: err.message })
    } else {
      res.status(500).json({ error: 'Failed to create page' })
    }
  }
})

// Update a page
router.put('/*id', requireAuth, async (req: AuthRequest, res: Response) => {
  const pageId = wildcardParam(req, 'id').toLowerCase()
  const parsed = idSchema.safeParse(pageId)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid page ID' })
    return
  }
  const bodySchema = z.object({
    content: z.string().max(MAX_CONTENT_BYTES),
  })
  const body = bodySchema.safeParse(req.body)
  if (!body.success) {
    res.status(400).json({ error: 'Invalid body' })
    return
  }
  try {
    await readPage(pagesDir(), parsed.data)
    const sanitized = sanitizePageContent(body.data.content)
    await writePage(pagesDir(), parsed.data, sanitized)
    await updateIndex(parsed.data, sanitized)
    await invalidateRenderCache(parsed.data)
    res.json({ success: true })
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      res.status(404).json({ error: 'Page not found' })
    } else if (err.message === 'Path traversal detected' || err.message === 'Path too deep') {
      res.status(400).json({ error: err.message })
    } else {
      res.status(500).json({ error: 'Failed to update page' })
    }
  }
})

// Delete a page (moves to _trash, requires auth)
router.delete('/*id', requireAuth, async (req: AuthRequest, res: Response) => {
  const pageId = wildcardParam(req, 'id').toLowerCase()
  const parsed = idSchema.safeParse(pageId)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid page ID' })
    return
  }
  try {
    await trashPage(pagesDir(), parsed.data)
    await removeFromIndex(parsed.data)
    await invalidateRenderCache(parsed.data)
    res.json({ success: true, trashed: true })
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      res.status(404).json({ error: 'Page not found' })
    } else if (err.message === 'Path traversal detected' || err.message === 'Path too deep') {
      res.status(400).json({ error: err.message })
    } else {
      res.status(500).json({ error: 'Failed to trash page' })
    }
  }
})

export default router
