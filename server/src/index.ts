// SPDX-License-Identifier: GPL-3.0-or-later
import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import authRoutes from './routes/auth.js'
import pagesRoutes from './routes/pages.js'
import mediaRoutes from './routes/media.js'
import searchRoutes from './routes/search.js'
import renderRoutes from './routes/render.js'
import configRoutes from './routes/config.js'
import adminRoutes from './routes/admin.js'
import { RATE_LIMITS } from './middleware/rateLimiter.js'
import { requestTimeout } from './middleware/requestTimeout.js'
import { lockCheck } from './middleware/lockCheck.js'
import { validateEnvironment } from './lib/envValidator.js'
import { rebuildIndex } from './lib/searchIndex.js'
import { initRenderCache, loadDiskCache } from './lib/renderCache.js'
import { logger } from './lib/logger.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const serverRoot = path.resolve(__dirname, '..')

// Resolve relative paths to absolute at startup to avoid CWD issues
if (process.env.PAGES_DIR && !path.isAbsolute(process.env.PAGES_DIR)) {
  process.env.PAGES_DIR = path.resolve(serverRoot, process.env.PAGES_DIR)
}
if (process.env.MEDIA_DIR && !path.isAbsolute(process.env.MEDIA_DIR)) {
  process.env.MEDIA_DIR = path.resolve(serverRoot, process.env.MEDIA_DIR)
}
if (process.env.TRASH_DIR && !path.isAbsolute(process.env.TRASH_DIR)) {
  process.env.TRASH_DIR = path.resolve(serverRoot, process.env.TRASH_DIR)
}

validateEnvironment()

const app = express()
const PORT = Number(process.env.PORT) || 3001

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      connectSrc: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
    },
  },
  frameguard: { action: 'deny' },
}))

app.use(cors({
  origin: process.env.CORS_ORIGIN === '*' ? true : (process.env.CORS_ORIGIN || true),
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
}))

app.use(requestTimeout(30000))

// Rewrite /wiki/* → /* for direct Express access (matches nginx/Vite behavior)
app.use((req, _res, next) => {
  if (req.path === '/wiki' || req.path.startsWith('/wiki/')) {
    req.url = req.originalUrl.replace(/^\/wiki/, '')
  }
  next()
})

app.use('/api/auth', RATE_LIMITS.auth)
app.use('/api/pages', (req, _, next) => {
  if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
    return RATE_LIMITS.write(req, _, next)
  }
  return RATE_LIMITS.read(req, _, next)
})
app.use('/api/media', (req, _, next) => {
  if (req.method === 'POST') {
    return RATE_LIMITS.write(req, _, next)
  }
  return RATE_LIMITS.read(req, _, next)
})

app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true, limit: '1mb' }))

app.use('/api/auth', authRoutes)
app.use('/api/config', configRoutes) // public — must be before lock check so locked status is readable

// Lock check applies to all routes below (auth + config are exempt, admins pass through)
app.use('/api', lockCheck)

app.use('/api/pages', pagesRoutes)
app.use('/api/media', mediaRoutes)
app.use('/api/search', RATE_LIMITS.read, searchRoutes)
app.use('/api/render', RATE_LIMITS.read, renderRoutes)
app.use('/api/admin', adminRoutes)

const clientDist = path.resolve(serverRoot, '../client/dist')
app.use(express.static(clientDist, { acceptRanges: false }))
app.get('/*path', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'))
})

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack })
  res.status(500).json({ error: 'Internal server error' })
})

app.listen(PORT, '0.0.0.0', async () => {
  logger.info(`Server running on http://localhost:${PORT}`)
  try {
    initRenderCache(process.env.PAGES_DIR!)
    await Promise.all([
      rebuildIndex(process.env.PAGES_DIR!),
      loadDiskCache(),
    ])
    logger.info(`Search index rebuilt, render cache loaded (${/* memCache size */ '?'} pages)`)
  } catch (err) {
    logger.warn('Startup init failed', { error: (err as Error).message })
  }
})

export default app
