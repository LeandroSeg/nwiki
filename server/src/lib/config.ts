// SPDX-License-Identifier: GPL-3.0-or-later
import { readFile, writeFile, access, mkdir } from 'node:fs/promises'
import path from 'node:path'

interface WikiConfig {
  siteName: string
  defaultFontSize: number
  locked: boolean
  lockedMessage: string
  language: string
  tokenExpiration: string
  faviconUrl: string
}

const DEFAULTS: WikiConfig = {
  siteName: 'nwiki',
  defaultFontSize: 100,
  locked: false,
  lockedMessage: 'This wiki is currently locked for maintenance.',
  language: 'pt',
  tokenExpiration: '7d',
  faviconUrl: '',
}

function getFilePath(): string {
  return path.resolve(process.cwd(), process.env.CONFIG_FILE || 'data/config.json')
}

let cache: WikiConfig | null = null

export function clearCache(): void {
  cache = null
}

export async function loadConfig(): Promise<WikiConfig> {
  if (cache) return cache
  try {
    await access(getFilePath())
    const raw = await readFile(getFilePath(), 'utf-8')
    const data = JSON.parse(raw)
    cache = { ...DEFAULTS, ...data }
    return cache!
  } catch {
    cache = { ...DEFAULTS }
    return cache!
  }
}

export async function getConfig(): Promise<WikiConfig> {
  return loadConfig()
}

export async function updateConfig(updates: Partial<WikiConfig>): Promise<WikiConfig> {
  const current = await loadConfig()
  const updated = { ...current, ...updates }
  await mkdir(path.dirname(getFilePath()), { recursive: true })
  await writeFile(getFilePath(), JSON.stringify(updated, null, 2), 'utf-8')
  cache = updated
  return updated
}

export async function isLocked(): Promise<boolean> {
  const cfg = await loadConfig()
  return cfg.locked
}
