// SPDX-License-Identifier: GPL-3.0-or-later
import { accessSync, constants } from 'node:fs'
import path from 'node:path'

export function validateEnvironment(): void {
  const required = ['JWT_SECRET', 'PAGES_DIR', 'MEDIA_DIR']
  const missing = required.filter(key => !process.env[key])

  if (missing.length > 0) {
    console.error(`Missing required env vars: ${missing.join(', ')}`)
    process.exit(1)
  }

  if (process.env.JWT_SECRET === 'change-me-in-production') {
    console.warn('WARNING: JWT_SECRET is still the default value. Change it in production.')
  }

  const pagesDir = path.resolve(process.cwd(), process.env.PAGES_DIR!)
  const mediaDir = path.resolve(process.cwd(), process.env.MEDIA_DIR!)
  try {
    accessSync(pagesDir, constants.R_OK)
    accessSync(mediaDir, constants.R_OK)
  } catch {
    console.warn('WARNING: PAGES_DIR or MEDIA_DIR does not exist or is not readable.')
  }
}
