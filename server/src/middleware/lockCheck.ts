// SPDX-License-Identifier: GPL-3.0-or-later
import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { isLocked, getConfig } from '../lib/config.js'
import { securityLogger } from '../lib/securityLogger.js'
import { isAdmin } from '../lib/users.js'

export async function lockCheck(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!(await isLocked())) return next()

  const header = req.headers.authorization
  let username: string | null = null

  if (header && header.startsWith('Bearer ')) {
    try {
      const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET || '') as { username: string }
      username = payload.username
    } catch { /* invalid token */ }
  }

  // Admins can always pass
  if (username && (await isAdmin(username))) return next()

  const cfg = await getConfig()
  securityLogger.warn('LOCK_BLOCK', { path: req.path })
  res.status(503).json({ error: cfg.lockedMessage, locked: true })
}
