// SPDX-License-Identifier: GPL-3.0-or-later
import { Router, Response } from 'express'
import { z } from 'zod'
import { requireAuth, AuthRequest } from '../middleware/auth.js'
import { isAdmin, loadUsers, approveUser, deactivateUser, updateUserGroups, updateUserType, updateUserRole } from '../lib/users.js'
import { getConfig, updateConfig } from '../lib/config.js'
import { listGroups, addGroup, renameGroup, removeGroup } from '../lib/groups.js'
import { securityLogger } from '../lib/securityLogger.js'

const router = Router()

const configSchema = z.object({
  siteName: z.string().min(1).max(100).optional(),
  defaultFontSize: z.number().min(60).max(200).optional(),
  locked: z.boolean().optional(),
  lockedMessage: z.string().max(500).optional(),
  language: z.enum(['pt', 'en']).optional(),
  tokenExpiration: z.string().regex(/^\d+[smhd]$/, { message: 'Must be like 24h, 7d, 60m' }).optional(),
  faviconUrl: z.string().max(500).optional(),
})

async function adminGuard(req: AuthRequest, res: Response): Promise<boolean> {
  if (!(await isAdmin(req.username!))) {
    res.status(403).json({ error: 'Only administrators can access this' })
    return false
  }
  return true
}

router.get('/config', requireAuth, async (req: AuthRequest, res: Response) => {
  if (!(await adminGuard(req, res))) return
  const cfg = await getConfig()
  res.json(cfg)
})

router.put('/config', requireAuth, async (req: AuthRequest, res: Response) => {
  if (!(await adminGuard(req, res))) return
  const parsed = configSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() })
    return
  }
  const updated = await updateConfig(parsed.data)
  securityLogger.info('CONFIG_UPDATED', { by: req.username })
  res.json(updated)
})

// Users
router.get('/users', requireAuth, async (req: AuthRequest, res: Response) => {
  if (!(await adminGuard(req, res))) return
  const users = await loadUsers()
  const list = users.map(u => ({
    username: u.username,
    email: u.email || null,
    displayName: u.displayName || null,
    role: u.role || 'user',
    active: u.active ?? true,
    userType: u.userType || 'B',
    groups: u.groups || ['todos'],
  }))
  res.json({ users: list })
})

router.post('/users/:username/activate', requireAuth, async (req: AuthRequest, res: Response) => {
  if (!(await adminGuard(req, res))) return
  const uname = req.params.username as string
  try {
    await approveUser(uname)
    securityLogger.info('USER_ACTIVATED', { by: req.username, target: uname })
    res.json({ success: true })
  } catch (err: any) {
    res.status(404).json({ error: err.message })
  }
})

router.post('/users/:username/deactivate', requireAuth, async (req: AuthRequest, res: Response) => {
  if (!(await adminGuard(req, res))) return
  const uname = req.params.username as string
  try {
    await deactivateUser(uname)
    securityLogger.info('USER_DEACTIVATED', { by: req.username, target: uname })
    res.json({ success: true })
  } catch (err: any) {
    res.status(404).json({ error: err.message })
  }
})

router.put('/users/:username/role', requireAuth, async (req: AuthRequest, res: Response) => {
  if (!(await adminGuard(req, res))) return
  const uname = req.params.username as string
  const schema = z.object({ role: z.enum(['admin', 'user']) })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: 'Invalid role' }); return }
  try {
    await updateUserRole(uname, parsed.data.role)
    securityLogger.info('USER_ROLE_CHANGED', { by: req.username, target: uname, role: parsed.data.role })
    res.json({ success: true })
  } catch (err: any) {
    res.status(404).json({ error: err.message })
  }
})

router.put('/users/:username/type', requireAuth, async (req: AuthRequest, res: Response) => {
  if (!(await adminGuard(req, res))) return
  const uname = req.params.username as string
  const schema = z.object({ userType: z.enum(['A', 'B', 'C', 'D']) })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: 'Invalid userType' }); return }
  try {
    await updateUserType(uname, parsed.data.userType)
    res.json({ success: true })
  } catch (err: any) {
    res.status(404).json({ error: err.message })
  }
})

router.put('/users/:username/groups', requireAuth, async (req: AuthRequest, res: Response) => {
  if (!(await adminGuard(req, res))) return
  const uname = req.params.username as string
  const schema = z.object({ groups: z.array(z.string()) })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: 'Invalid groups' }); return }
  try {
    await updateUserGroups(uname, parsed.data.groups)
    res.json({ success: true })
  } catch (err: any) {
    res.status(404).json({ error: err.message })
  }
})

// Groups CRUD
router.get('/groups', requireAuth, async (req: AuthRequest, res: Response) => {
  if (!(await adminGuard(req, res))) return
  const groups = await listGroups()
  res.json({ groups })
})

router.post('/groups', requireAuth, async (req: AuthRequest, res: Response) => {
  if (!(await adminGuard(req, res))) return
  const schema = z.object({ name: z.string().min(1).max(100) })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: 'Invalid name' }); return }
  const group = await addGroup(parsed.data.name)
  securityLogger.info('GROUP_CREATED', { by: req.username, group: group.id })
  res.status(201).json(group)
})

router.put('/groups/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  if (!(await adminGuard(req, res))) return
  const schema = z.object({ name: z.string().min(1).max(100) })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: 'Invalid name' }); return }
  try {
    await renameGroup(req.params.id as string, parsed.data.name)
    res.json({ success: true })
  } catch (err: any) {
    res.status(404).json({ error: err.message })
  }
})

router.delete('/groups/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  if (!(await adminGuard(req, res))) return
  try {
    await removeGroup(req.params.id as string)
    res.json({ success: true })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

export default router
