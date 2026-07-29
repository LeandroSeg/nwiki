// SPDX-License-Identifier: GPL-3.0-or-later
import { Request, Response, NextFunction } from 'express'
import { fileTypeFromBuffer } from 'file-type'

const ALLOWED_MIMES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/bmp',
  'image/tiff',
  'image/svg+xml',
  'image/x-icon',
  'application/pdf',
  'application/zip',
  'application/x-rar-compressed',
  'application/x-7z-compressed',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]

const SAFE_NAME = /^[\w.\- ]+$/

export async function validateUpload(req: Request, res: Response, next: NextFunction) {
  if (!req.file) {
    next()
    return
  }

  if (!SAFE_NAME.test(req.file.originalname)) {
    res.status(400).json({ error: 'Invalid filename characters' })
    return
  }

  const type = await fileTypeFromBuffer(req.file.buffer)
  if (!type || !ALLOWED_MIMES.includes(type.mime)) {
    res.status(400).json({ error: 'File type not allowed' })
    return
  }

  next()
}
