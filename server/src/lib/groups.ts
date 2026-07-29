// SPDX-License-Identifier: GPL-3.0-or-later
import { readFile, writeFile, access, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { v4 as uuidv4 } from 'uuid'

interface Group {
  id: string
  name: string
}

type GroupsData = { groups: Group[] }

function getFilePath(): string {
  return path.resolve(process.cwd(), process.env.GROUPS_FILE || 'data/groups.json')
}

let cache: Group[] | null = null

export function clearCache(): void {
  cache = null
}

async function loadRaw(): Promise<Group[]> {
  if (cache) return cache
  try {
    await access(getFilePath())
    const raw = await readFile(getFilePath(), 'utf-8')
    const data: GroupsData = JSON.parse(raw)
    cache = data.groups
  } catch {
    cache = [{ id: 'todos', name: 'TODOS' }]
  }
  return cache!
}

async function save(groups: Group[]): Promise<void> {
  await mkdir(path.dirname(getFilePath()), { recursive: true })
  await writeFile(getFilePath(), JSON.stringify({ groups }, null, 2), 'utf-8')
  cache = groups
}

export async function listGroups(): Promise<Group[]> {
  return loadRaw()
}

export async function addGroup(name: string): Promise<Group> {
  const groups = await loadRaw()
  const id = uuidv4().slice(0, 8)
  const group: Group = { id, name }
  groups.push(group)
  await save(groups)
  return group
}

export async function renameGroup(id: string, name: string): Promise<void> {
  const groups = await loadRaw()
  const g = groups.find(g => g.id === id)
  if (!g) throw new Error('Group not found')
  g.name = name
  await save(groups)
}

export async function removeGroup(id: string): Promise<void> {
  if (id === 'todos') throw new Error('Cannot remove the TODOS group')
  const groups = await loadRaw()
  const idx = groups.findIndex(g => g.id === id)
  if (idx === -1) throw new Error('Group not found')
  groups.splice(idx, 1)
  await save(groups)
}

export function getDefaultGroupId(): string {
  return 'todos'
}
