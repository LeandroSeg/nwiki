// SPDX-License-Identifier: GPL-3.0-or-later
import { Router, Request, Response } from 'express'
import jwt, { type SignOptions } from 'jsonwebtoken'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'
import { hasUsers, validateUser, createUser, addUser, updateProfile, getUser, isAdmin, listPendingUsers, approveUser } from '../lib/users.js'
import { securityLogger } from '../lib/securityLogger.js'
import { checkLockout, recordAttempt, clearAttempts } from '../lib/lockout.js'
import { getConfig } from '../lib/config.js'

const router = Router()

const loginSchema = z.object({
  username: z.string().min(1).max(50),
  password: z.string().min(1).max(128),
})

const setupSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(8).max(128),
  email: z.string().email().optional(),
})

// GET /api/auth/status — check if any user exists (first-run detection)
router.get('/status', async (_req: Request, res: Response) => {
  const exists = await hasUsers()
  res.json({ hasUsers: exists })
})

// POST /api/auth/setup — create first admin user (only if no users exist)
router.post('/setup', async (req: Request, res: Response) => {
  const exists = await hasUsers()
  if (exists) {
    res.status(409).json({ error: 'Users already exist' })
    return
  }

  const parsed = setupSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() })
    return
  }

  const { username, password, email } = parsed.data
  await createUser(username, password, email)

  const secret = process.env.JWT_SECRET
  if (!secret) {
    securityLogger.error('SETUP_NO_SECRET')
    res.status(500).json({ error: 'Server configuration error' })
    return
  }
  const cfg = await getConfig()
  const expiresIn = process.env.JWT_EXPIRES_IN || cfg.tokenExpiration || '7d'
  const jti = uuidv4()
  const token = jwt.sign({ username, jti, role: 'admin' }, secret, { expiresIn: expiresIn } as SignOptions)

  securityLogger.info('FIRST_USER_CREATED', { username })
  res.status(201).json({ token, username })
})

// POST /api/auth/login — authenticate existing user
router.post('/login', async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() })
    return
  }

  const { username, password } = parsed.data

  if (await checkLockout(username)) {
    securityLogger.warn('LOGIN_LOCKOUT', { username })
    res.status(429).json({ error: 'Account locked. Too many failed attempts. Try again in 15 minutes.' })
    return
  }

  const user = await validateUser(username, password)
  if (!user) {
    await recordAttempt(username)
    securityLogger.warn('LOGIN_FAIL', { username })
    res.status(401).json({ error: 'Invalid credentials' })
    return
  }

  if (user.active === false) {
    securityLogger.warn('LOGIN_INACTIVE', { username })
    res.status(403).json({ error: 'Account pending approval by an administrator' })
    return
  }

  await clearAttempts(username)
  const secret = process.env.JWT_SECRET
  if (!secret) {
    securityLogger.error('LOGIN_NO_SECRET')
    res.status(500).json({ error: 'Server configuration error' })
    return
  }
  const cfg = await getConfig()
  const expiresIn = process.env.JWT_EXPIRES_IN || cfg.tokenExpiration || '7d'
  const jti = uuidv4()
  const token = jwt.sign({ username: user.username, jti }, secret, { expiresIn: expiresIn } as SignOptions)

  res.json({ token, username: user.username, displayName: user.displayName || null })
})

// POST /api/auth/register — create additional users (admin only, created as inactive)
const registerSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(8).max(128),
  email: z.string().email().optional(),
})

import { requireAuth, AuthRequest } from '../middleware/auth.js'
import { RATE_LIMITS } from '../middleware/rateLimiter.js'
import { wildcardParam } from '../lib/params.js'

router.post('/register', requireAuth, async (req: AuthRequest, res: Response) => {
  if (!(await isAdmin(req.username!))) {
    res.status(403).json({ error: 'Only administrators can create users' })
    return
  }

  const parsed = registerSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() })
    return
  }

  const { username, password, email } = parsed.data
  try {
    await addUser(username, password, email)
    securityLogger.info('USER_CREATED', { by: req.username, created: username })
    res.status(201).json({ success: true, username, pending: true })
  } catch (err: any) {
    if (err.message === 'Username already exists') {
      res.status(409).json({ error: 'Username already exists' })
    } else {
      securityLogger.error('REGISTER_FAIL', { error: err.message })
      res.status(500).json({ error: 'Failed to create user' })
    }
  }
})

// PUT /api/auth/profile — update email, displayName or password (auth required)
const profileSchema = z.object({
  email: z.string().email().optional(),
  displayName: z.string().min(1).max(100).optional(),
  newPassword: z.string().min(8).max(128).optional(),
  currentPassword: z.string().min(1).optional(),
})

router.put('/profile', requireAuth, RATE_LIMITS.write, async (req: AuthRequest, res: Response) => {
  const parsed = profileSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() })
    return
  }

  const { email, displayName, newPassword, currentPassword } = parsed.data

  if (newPassword && !currentPassword) {
    res.status(400).json({ error: 'Current password required to set a new password' })
    return
  }

  if (newPassword && currentPassword) {
    const user = await validateUser(req.username!, currentPassword)
    if (!user) {
      res.status(403).json({ error: 'Current password is incorrect' })
      return
    }
  }

  try {
    await updateProfile(req.username!, {
      email,
      displayName,
      password: newPassword,
    })
    securityLogger.info('PROFILE_UPDATED', { username: req.username })
    res.json({ success: true })
  } catch (err: any) {
    securityLogger.error('PROFILE_UPDATE_FAIL', { error: err.message })
    res.status(500).json({ error: 'Failed to update profile' })
  }
})

// GET /api/auth/me — get current user profile (auth required)
router.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const profile = await getUser(req.username!)
    if (!profile) { res.status(404).json({ error: 'User not found' }); return }
    res.json(profile)
  } catch {
    res.status(500).json({ error: 'Failed to get profile' })
  }
})

// GET /api/auth/pending — list users pending approval (admin only)
router.get('/pending', requireAuth, async (req: AuthRequest, res: Response) => {
  if (!(await isAdmin(req.username!))) {
    res.status(403).json({ error: 'Only administrators can view pending users' })
    return
  }
  try {
    const pending = await listPendingUsers()
    res.json({ users: pending })
  } catch {
    res.status(500).json({ error: 'Failed to list pending users' })
  }
})

// POST /api/auth/approve/:username — approve a pending user (admin only)
router.post('/approve/:username', requireAuth, async (req: AuthRequest, res: Response) => {
  if (!(await isAdmin(req.username!))) {
    res.status(403).json({ error: 'Only administrators can approve users' })
    return
  }
  try {
    const targetUsername = req.params.username as string
    await approveUser(targetUsername)
    securityLogger.info('USER_APPROVED', { by: req.username, approved: targetUsername })
    res.json({ success: true })
  } catch (err: any) {
    if (err.message === 'User not found') {
      res.status(404).json({ error: 'User not found' })
    } else {
      res.status(500).json({ error: 'Failed to approve user' })
    }
  }
})

export default router
