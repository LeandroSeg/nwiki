// SPDX-License-Identifier: GPL-3.0-or-later
import { readFile, writeFile, access } from 'node:fs/promises'
import path from 'node:path'

function getFilePath(): string {
  return path.resolve(process.cwd(), process.env.BLACKLIST_FILE || 'data/tokenBlacklist.json')
}

async function readBlacklist(): Promise<string[]> {
  try {
    await access(getFilePath())
    const raw = await readFile(getFilePath(), 'utf-8')
    return JSON.parse(raw)
  } catch {
    return []
  }
}

async function writeBlacklist(list: string[]): Promise<void> {
  await writeFile(getFilePath(), JSON.stringify(list, null, 2), 'utf-8')
}

let cache: string[] | null = null

export async function isBlacklisted(jti: string): Promise<boolean> {
  if (!cache) cache = await readBlacklist()
  return cache.includes(jti)
}

export async function blacklistToken(jti: string): Promise<void> {
  if (!cache) cache = await readBlacklist()
  cache.push(jti)
  await writeBlacklist(cache)
}
