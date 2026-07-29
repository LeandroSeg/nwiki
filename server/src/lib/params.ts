// SPDX-License-Identifier: GPL-3.0-or-later
import type { Request } from 'express'

export function wildcardParam(req: Request, name: string): string {
  const val = req.params[name]
  if (Array.isArray(val)) return val.join('/')
  return val
}
