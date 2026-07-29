// SPDX-License-Identifier: GPL-3.0-or-later
import { Request, Response, NextFunction } from 'express'

export function requestTimeout(ms: number = 30000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const timer = setTimeout(() => {
      if (!res.headersSent) {
        res.status(408).json({ error: 'Request timeout' })
      }
    }, ms)

    res.on('finish', () => clearTimeout(timer))
    next()
  }
}
