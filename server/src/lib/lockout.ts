// SPDX-License-Identifier: GPL-3.0-or-later
import { readFile, writeFile, access, mkdir } from 'node:fs/promises'
import path from 'node:path'

interface LockoutEntry {
  attempts: number
  lastAttempt: number
  lockedUntil: number | null
}

interface LockoutData {
  [username: string]: LockoutEntry
}

const LOCKOUT_THRESHOLD = 5
const LOCKOUT_DURATION_MS = 15 * 60 * 1000

function getFilePath(): string {
  return path.resolve(process.cwd(), process.env.LOCKOUT_FILE || 'data/lockout.json')
}

async function readLockouts(): Promise<LockoutData> {
  try {
    await access(getFilePath())
    const raw = await readFile(getFilePath(), 'utf-8')
    const data: LockoutData = JSON.parse(raw)
    const now = Date.now()
    let changed = false
    for (const [username, entry] of Object.entries(data)) {
      if (entry.lockedUntil && now > entry.lockedUntil) {
        delete data[username]
        changed = true
      }
    }
    if (changed) await writeLockouts(data)
    return data
  } catch {
    return {}
  }
}

async function writeLockouts(data: LockoutData): Promise<void> {
  await mkdir(path.dirname(getFilePath()), { recursive: true })
  await writeFile(getFilePath(), JSON.stringify(data, null, 2), 'utf-8')
}

let cache: LockoutData | null = null

export async function checkLockout(username: string): Promise<boolean> {
  if (!cache) cache = await readLockouts()
  const entry = cache[username]
  if (!entry || !entry.lockedUntil) return false
  if (Date.now() > entry.lockedUntil) {
    entry.lockedUntil = null
    entry.attempts = 0
    await writeLockouts(cache)
    return false
  }
  return true
}

export async function recordAttempt(username: string): Promise<void> {
  if (!cache) cache = await readLockouts()
  const now = Date.now()
  const entry = cache[username] || { attempts: 0, lastAttempt: 0, lockedUntil: null }

  entry.attempts++
  entry.lastAttempt = now

  if (entry.attempts >= LOCKOUT_THRESHOLD) {
    entry.lockedUntil = now + LOCKOUT_DURATION_MS
  }

  cache[username] = entry
  await writeLockouts(cache)
}

export async function clearAttempts(username: string): Promise<void> {
  if (!cache) cache = await readLockouts()
  delete cache[username]
  await writeLockouts(cache)
}
