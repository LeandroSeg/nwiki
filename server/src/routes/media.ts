// SPDX-License-Identifier: GPL-3.0-or-later
import { Router, Response } from 'express'
import multer from 'multer'
import path from 'node:path'
import { promises as fs } from 'node:fs'
import { z } from 'zod'
import { requireAuth, AuthRequest } from '../middleware/auth.js'
import { validateUpload } from '../middleware/uploadValidator.js'
import { readMedia, writeMedia, deleteMedia, listMedia, type MediaEntry } from '../lib/fileHandler.js'
import { securityLogger } from '../lib/securityLogger.js'
import { wildcardParam } from '../lib/params.js'

const router = Router()
const mediaDir = () => process.env.MEDIA_DIR || '../public/wiki/media'
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
})

const nameSchema = z.string().min(1).max(255)

// List media with metadata (optional ?dir=subfolder for non-recursive listing)
router.get('/', async (req, res: Response) => {
  try {
    const dir = (req.query.dir as string) || ''
    const entries = await listMedia(mediaDir())
    const prefix = dir ? dir + '/' : ''
    const enriched = await Promise.all(
      entries
        .filter(e => e.name === dir || (e.name.startsWith(prefix) && e.name.slice(prefix.length).split('/').length <= 2))
        .map(async (e) => {
          const display = e.name === dir ? '.' : e.name.slice(prefix.length)
          const isDirectChild = !display.includes('/')
          if (!isDirectChild && !e.isDir) return null
          if (!isDirectChild && e.isDir) {
            const childName = display.split('/')[0]
            return { name: childName, isDir: true, size: 0, modified: '', type: 'dir' }
          }
          if (e.isDir) {
            return { name: e.name, isDir: true, size: 0, modified: '', type: 'dir' }
          }
          try {
            const stats = await fs.stat(path.join(mediaDir(), e.name))
            const ext = path.extname(e.name).toLowerCase()
            return { name: e.name, isDir: false, size: stats.size, modified: stats.mtime.toISOString(), type: ext }
          } catch {
            return { name: e.name, isDir: false, size: 0, modified: '', type: '' }
          }
        })
    )
    const filtered = enriched.filter((e): e is NonNullable<typeof e> => e !== null)
    const unique = filtered.filter((e, i, a) => a.findIndex(x => x.name === e.name) === i)
    res.json({ files: unique })
  } catch {
    res.status(500).json({ error: 'Failed to list media' })
  }
})

// Serve a media file (supports subdirectories)
router.get('/*filename', async (req, res: Response) => {
  const filepath = wildcardParam(req, 'filename')
  const parsed = nameSchema.safeParse(filepath)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid filename' })
    return
  }
  try {
    const data = await readMedia(mediaDir(), parsed.data)
    const ext = path.extname(parsed.data).toLowerCase()
    const mimeMap: Record<string, string> = {
      '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
      '.gif': 'image/gif', '.webp': 'image/webp', '.bmp': 'image/bmp',
      '.tiff': 'image/tiff', '.tif': 'image/tiff',
      '.pdf': 'application/pdf', '.zip': 'application/zip',
      '.rar': 'application/x-rar-compressed', '.7z': 'application/x-7z-compressed',
      '.doc': 'application/msword', '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel', '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.ppt': 'application/vnd.ms-powerpoint', '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    }
    res.type(mimeMap[ext] || 'application/octet-stream').send(data)
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      res.status(404).json({ error: 'File not found' })
    } else {
      res.status(500).json({ error: 'Failed to read file' })
    }
  }
})

// Upload a file (with subdirectory support via path in form field)
router.post('/', requireAuth, upload.single('file'), validateUpload, async (req: AuthRequest, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: 'No file provided' })
    return
  }
  const destPath = (req.body.path as string) || req.file.originalname
  try {
    await writeMedia(mediaDir(), destPath, req.file.buffer)
    securityLogger.info('MEDIA_UPLOADED', { by: req.username, filename: destPath })
    res.status(201).json({ success: true, filename: destPath })
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to upload file' })
  }
})

// Delete a media file
router.delete('/*filename', requireAuth, async (req: AuthRequest, res: Response) => {
  const filepath = wildcardParam(req, 'filename')
  const parsed = nameSchema.safeParse(filepath)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid filename' })
    return
  }
  try {
    await deleteMedia(mediaDir(), parsed.data)
    securityLogger.info('MEDIA_DELETED', { by: req.username, filename: parsed.data })
    res.json({ success: true })
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      res.status(404).json({ error: 'File not found' })
    } else {
      res.status(500).json({ error: 'Failed to delete file' })
    }
  }
})

export default router
