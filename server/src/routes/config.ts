// SPDX-License-Identifier: GPL-3.0-or-later
import { Router, Request, Response } from 'express'
import { getConfig } from '../lib/config.js'

const router = Router()

router.get('/', async (_req: Request, res: Response) => {
  const cfg = await getConfig()
  res.json({
    startPage: process.env.START_PAGE || '',
    siteName: cfg.siteName,
    defaultFontSize: cfg.defaultFontSize,
    locked: cfg.locked,
    lockedMessage: cfg.lockedMessage,
    language: cfg.language,
    faviconUrl: cfg.faviconUrl,
  })
})

export default router
