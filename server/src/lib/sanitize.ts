// SPDX-License-Identifier: GPL-3.0-or-later
import { JSDOM } from 'jsdom'
import DOMPurify from 'dompurify'

const window = new JSDOM('').window
const purify = DOMPurify(window as any)

export function sanitizePageContent(content: string): string {
  return purify.sanitize(content, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  })
}
