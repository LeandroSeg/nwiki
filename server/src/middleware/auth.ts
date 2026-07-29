// SPDX-License-Identifier: GPL-3.0-or-later
import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { securityLogger } from '../lib/securityLogger.js'
import { isBlacklisted } from '../lib/tokenBlacklist.js'

export interface AuthRequest extends Request {
  username?: string
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token required' })
    return
  }

  const token = header.slice(7)
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required')
  }

  try {
    const payload = jwt.verify(token, secret) as { username: string; jti?: string; iat?: number }

    // Reject tokens with iat in the future
    if (payload.iat && payload.iat > Math.floor(Date.now() / 1000)) {
      securityLogger.warn('AUTH_IAT_FUTURE', { username: payload.username })
      res.status(403).json({ error: 'Invalid token' })
      return
    }

    if (payload.jti && await isBlacklisted(payload.jti)) {
      securityLogger.warn('AUTH_BLACKLISTED', { username: payload.username })
      res.status(403).json({ error: 'Token revoked' })
      return
    }

    req.username = payload.username
    next()
  } catch (err) {
    securityLogger.warn('AUTH_403', { error: (err as Error).message })
    res.status(403).json({ error: 'Invalid or expired token' })
  }
}

export function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    next()
    return
  }

  const token = header.slice(7)
  const secret = process.env.JWT_SECRET
  if (!secret) { next(); return }

  try {
    const payload = jwt.verify(token, secret) as { username: string }
    req.username = payload.username
  } catch { /* ignore invalid tokens */ }
  next()
}
