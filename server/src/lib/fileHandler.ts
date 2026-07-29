// SPDX-License-Identifier: GPL-3.0-or-later
import { promises as fs } from 'node:fs'
import path from 'node:path'

const MAX_DEPTH = 5

function safeResolve(baseDir: string, id: string): string {
  id = id.toLowerCase()
  if (id.includes('..')) {
    throw new Error('Path traversal detected')
  }
  const sanitized = id.replace(/^\/+/, '')
  const segments = sanitized.split('/').filter(Boolean)
  if (segments.length > MAX_DEPTH) {
    throw new Error('Path too deep')
  }
  const full = path.resolve(baseDir, segments.join('/'))
  if (!full.startsWith(path.resolve(baseDir))) {
    throw new Error('Path traversal detected')
  }
  return full
}

export async function readPage(pagesDir: string, id: string): Promise<string> {
  const filePath = safeResolve(pagesDir, `${id}.txt`)
  return fs.readFile(filePath, 'utf-8')
}

export async function writePage(pagesDir: string, id: string, content: string): Promise<void> {
  const filePath = safeResolve(pagesDir, `${id}.txt`)
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, content, 'utf-8')
}

export async function deletePage(pagesDir: string, id: string): Promise<void> {
  const filePath = safeResolve(pagesDir, `${id}.txt`)
  await fs.unlink(filePath)
}

function getTrashDir(pagesDir: string): string {
  return process.env.TRASH_DIR || path.join(pagesDir, '_trash')
}

export async function trashPage(pagesDir: string, id: string): Promise<void> {
  const filePath = safeResolve(pagesDir, `${id}.txt`)
  const trashDir = getTrashDir(pagesDir)
  const trashPath = safeResolve(trashDir, `${id}.txt`)
  await fs.mkdir(path.dirname(trashPath), { recursive: true })
  await fs.rename(filePath, trashPath)
}

export async function restorePage(pagesDir: string, id: string): Promise<void> {
  const trashDir = getTrashDir(pagesDir)
  const trashPath = safeResolve(trashDir, `${id}.txt`)
  const filePath = safeResolve(pagesDir, `${id}.txt`)
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.rename(trashPath, filePath)
}

export async function listTrash(pagesDir: string): Promise<string[]> {
  const trashDir = getTrashDir(pagesDir)
  const files: string[] = []
  try {
    await fs.access(trashDir)
    async function walk(dir: string, depth = 0) {
      if (depth > MAX_DEPTH) return
      const entries = await fs.readdir(dir, { withFileTypes: true })
      for (const entry of entries) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          await walk(full, depth + 1)
        } else if (entry.name.endsWith('.txt')) {
          files.push(path.relative(trashDir, full).replace(/\.txt$/, '').replace(/\\/g, '/'))
        }
      }
    }
    await walk(trashDir)
  } catch {
    // trash directory doesn't exist yet
  }
  return files.sort()
}

export async function listPages(pagesDir: string): Promise<string[]> {
  const files: string[] = []
  async function walk(dir: string, depth = 0) {
    if (depth > MAX_DEPTH) return
    const entries = await fs.readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.name === '_trash') continue
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        await walk(full, depth + 1)
      } else if (entry.name.endsWith('.txt')) {
        files.push(path.relative(pagesDir, full).replace(/\.txt$/, '').replace(/\\/g, '/'))
      }
    }
  }
  await walk(pagesDir)
  return files.sort()
}

export async function readMedia(mediaDir: string, filename: string): Promise<Buffer> {
  const filePath = safeResolve(mediaDir, filename)
  return fs.readFile(filePath)
}

export async function writeMedia(mediaDir: string, filename: string, buffer: Buffer): Promise<void> {
  const filePath = safeResolve(mediaDir, filename)
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, buffer)
}

export async function deleteMedia(mediaDir: string, filename: string): Promise<void> {
  const filePath = safeResolve(mediaDir, filename)
  await fs.unlink(filePath)
}

export interface MediaEntry {
  name: string
  isDir: boolean
}

export async function listMedia(mediaDir: string, prefix = ''): Promise<MediaEntry[]> {
  const entries: MediaEntry[] = []
  const dir = prefix ? path.join(mediaDir, prefix) : mediaDir
  try {
    const items = await fs.readdir(dir, { withFileTypes: true })
    for (const item of items) {
      if (item.name === '.gitkeep') continue
      if (item.name.startsWith('.')) continue
      const relPath = prefix ? `${prefix}/${item.name}` : item.name
      entries.push({ name: relPath, isDir: item.isDirectory() })
      if (item.isDirectory()) {
        const sub = await listMedia(mediaDir, relPath)
        entries.push(...sub)
      }
    }
  } catch { /* dir not found */ }
  return entries
}
