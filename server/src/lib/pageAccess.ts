// SPDX-License-Identifier: GPL-3.0-or-later
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { getDefaultGroupId } from './groups.js'

function metaDir(pagesDir: string): string {
  return path.join(pagesDir, '_meta')
}

function metaPath(pagesDir: string, pageId: string): string {
  const safe = pageId.replace(/\.\./g, '').replace(/[\/\\]/g, '_')
  return path.join(metaDir(pagesDir), `${safe}.json`)
}

interface PageMeta {
  groups: string[]
}

const groupCache = new Map<string, string[]>()

export function clearGroupCache(pageId?: string): void {
  if (pageId) {
    groupCache.delete(pageId)
  } else {
    groupCache.clear()
  }
}

export async function getPageGroups(pagesDir: string, pageId: string): Promise<string[]> {
  const cacheKey = `${pagesDir}::${pageId}`
  const cached = groupCache.get(cacheKey)
  if (cached) return cached

  const fp = metaPath(pagesDir, pageId)
  try {
    const raw = await readFile(fp, 'utf-8')
    const data: PageMeta = JSON.parse(raw)
    groupCache.set(cacheKey, data.groups)
    return data.groups
  } catch {
    const def = [getDefaultGroupId()]
    groupCache.set(cacheKey, def)
    return def
  }
}

export async function setPageGroups(pagesDir: string, pageId: string, groups: string[]): Promise<void> {
  const fp = metaPath(pagesDir, pageId)
  const dir = path.dirname(fp)
  await mkdir(dir, { recursive: true })
  const data: PageMeta = { groups }
  await writeFile(fp, JSON.stringify(data, null, 2), 'utf-8')
  clearGroupCache(pageId)
}

export async function removePageMeta(pagesDir: string, pageId: string): Promise<void> {
  const fp = metaPath(pagesDir, pageId)
  try {
    await writeFile(fp, JSON.stringify({ groups: [getDefaultGroupId()] }, null, 2), 'utf-8')
  } catch { /* no meta to reset */ }
  clearGroupCache(pageId)
}

export function userCanAccess(userGroups: string[], pageGroups: string[]): boolean {
  return pageGroups.some(g => userGroups.includes(g))
}
