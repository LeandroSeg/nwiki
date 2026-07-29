// SPDX-License-Identifier: GPL-3.0-or-later
import { readFile, writeFile, mkdir, unlink } from 'node:fs/promises'
import path from 'node:path'

const memCache = new Map<string, string>()
let cacheDir = ''

export function initRenderCache(pagesDir: string): void {
  cacheDir = path.join(pagesDir, '_cache')
}

export async function loadDiskCache(): Promise<void> {
  if (!cacheDir) return
  try {
    const entries = await import('node:fs/promises').then(fs => fs.readdir(cacheDir))
    for (const entry of entries) {
      if (!entry.endsWith('.html')) continue
      const pageId = entry.slice(0, -5).replace(/_s_/g, '/')
      try {
        const content = await readFile(path.join(cacheDir, entry), 'utf-8')
        memCache.set(pageId, content)
      } catch { /* skip corrupted */ }
    }
    if (entries.length > 0) console.log(`[cache] loaded ${memCache.size} cached pages from disk`)
  } catch { /* no cache dir yet */ }
}

function pageToFile(pageId: string): string {
  return pageId.replace(/\//g, '_s_') + '.html'
}

export function getCachedRender(pageId: string): string | undefined {
  return memCache.get(pageId)
}

export async function setCachedRender(pageId: string, html: string): Promise<void> {
  memCache.set(pageId, html)
  if (!cacheDir) return
  try {
    await mkdir(cacheDir, { recursive: true })
    await writeFile(path.join(cacheDir, pageToFile(pageId)), html, 'utf-8')
  } catch { /* disk cache write failure is non-fatal */ }
}

export async function invalidateRenderCache(pageId?: string): Promise<void> {
  if (pageId) {
    memCache.delete(pageId)
    if (cacheDir) {
      try {
        await unlink(path.join(cacheDir, pageToFile(pageId)))
      } catch { /* ok */ }
    }
  } else {
    memCache.clear()
    if (cacheDir) {
      try {
        const { rm } = await import('node:fs/promises')
        await rm(cacheDir, { recursive: true, force: true })
      } catch { /* ok */ }
    }
  }
}
