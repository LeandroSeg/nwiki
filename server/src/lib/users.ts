// SPDX-License-Identifier: GPL-3.0-or-later
import { readFile, writeFile, access, mkdir } from 'node:fs/promises'
import path from 'node:path'
import bcrypt from 'bcryptjs'

interface User {
  username: string
  passwordHash: string
  email?: string
  displayName?: string
  role?: 'admin' | 'user'
  active?: boolean
  userType?: 'A' | 'B' | 'C' | 'D'
  groups?: string[]
}

interface UsersFile {
  users: User[]
}

let cachedUsers: User[] | null = null

function getFilePath(): string {
  return path.resolve(process.cwd(), process.env.USERS_FILE || 'data/users.json')
}

export function clearCache(): void {
  cachedUsers = null
}

export async function hasUsers(): Promise<boolean> {
  try {
    await access(getFilePath())
    const raw = await readFile(getFilePath(), 'utf-8')
    const data: UsersFile = JSON.parse(raw)
    return data.users.length > 0
  } catch {
    return false
  }
}

export async function loadUsers(): Promise<User[]> {
  if (cachedUsers) return cachedUsers
  const raw = await readFile(getFilePath(), 'utf-8')
  const data: UsersFile = JSON.parse(raw)
  cachedUsers = data.users
  return cachedUsers
}

export async function validateUser(username: string, password: string): Promise<User | null> {
  const users = await loadUsers()
  const user = users.find(u => u.username === username)
  if (!user) return null
  const valid = await bcrypt.compare(password, user.passwordHash)
  return valid ? user : null
}

export async function createUser(username: string, password: string, email?: string): Promise<void> {
  await mkdir(path.dirname(getFilePath()), { recursive: true })
  const passwordHash = await bcrypt.hash(password, 12)
  const data: UsersFile = { users: [{ username, passwordHash, email, role: 'admin', active: true }] }
  await writeFile(getFilePath(), JSON.stringify(data, null, 2), 'utf-8')
  cachedUsers = null
}

export async function addUser(username: string, password: string, email?: string): Promise<void> {
  await mkdir(path.dirname(getFilePath()), { recursive: true })
  const passwordHash = await bcrypt.hash(password, 12)
  const existing: User[] = await loadUsers().catch(() => [])
  if (existing.some(u => u.username === username)) {
    throw new Error('Username already exists')
  }
  existing.push({ username, passwordHash, email, role: 'user', active: false, userType: 'B', groups: ['todos'] })
  await writeFile(getFilePath(), JSON.stringify({ users: existing }, null, 2), 'utf-8')
  cachedUsers = null
}

export async function updateUserGroups(username: string, groups: string[]): Promise<void> {
  const users = await loadUsers()
  const idx = users.findIndex(u => u.username === username)
  if (idx === -1) throw new Error('User not found')
  users[idx].groups = groups
  await writeFile(getFilePath(), JSON.stringify({ users }, null, 2), 'utf-8')
  cachedUsers = null
}

export async function updateUserRole(username: string, role: 'admin' | 'user'): Promise<void> {
  const users = await loadUsers()
  const idx = users.findIndex(u => u.username === username)
  if (idx === -1) throw new Error('User not found')
  users[idx].role = role
  await writeFile(getFilePath(), JSON.stringify({ users }, null, 2), 'utf-8')
  cachedUsers = null
}

export async function updateUserType(username: string, userType: 'A' | 'B' | 'C' | 'D'): Promise<void> {
  const users = await loadUsers()
  const idx = users.findIndex(u => u.username === username)
  if (idx === -1) throw new Error('User not found')
  users[idx].userType = userType
  await writeFile(getFilePath(), JSON.stringify({ users }, null, 2), 'utf-8')
  cachedUsers = null
}

export async function getUser(username: string): Promise<{ username: string; email?: string; displayName?: string; role?: string; active?: boolean; userType?: string; groups?: string[] } | null> {
  const users = await loadUsers()
  const user = users.find(u => u.username === username)
  if (!user) return null
  return { username: user.username, email: user.email, displayName: user.displayName, role: user.role, active: user.active, userType: user.userType, groups: user.groups }
}

export async function isAdmin(username: string): Promise<boolean> {
  const users = await loadUsers()
  const user = users.find(u => u.username === username)
  return user?.role === 'admin'
}

export async function getUserAccessInfo(username: string): Promise<{ isAdmin: boolean; groups: string[] }> {
  const users = await loadUsers()
  const user = users.find(u => u.username === username)
  if (!user) return { isAdmin: false, groups: ['todos'] }
  return {
    isAdmin: user.role === 'admin',
    groups: user.groups || ['todos'],
  }
}

export async function listPendingUsers(): Promise<{ username: string; email?: string }[]> {
  const users = await loadUsers()
  return users.filter(u => !u.active).map(u => ({ username: u.username, email: u.email }))
}

export async function deactivateUser(username: string): Promise<void> {
  const users = await loadUsers()
  const idx = users.findIndex(u => u.username === username)
  if (idx === -1) throw new Error('User not found')
  users[idx].active = false
  await writeFile(getFilePath(), JSON.stringify({ users }, null, 2), 'utf-8')
  cachedUsers = null
}

export async function approveUser(username: string): Promise<void> {
  const users = await loadUsers()
  const idx = users.findIndex(u => u.username === username)
  if (idx === -1) throw new Error('User not found')
  users[idx].active = true
  await writeFile(getFilePath(), JSON.stringify({ users }, null, 2), 'utf-8')
  cachedUsers = null
}

export async function updateProfile(
  username: string,
  updates: { email?: string; password?: string; displayName?: string },
): Promise<void> {
  const users = await loadUsers()
  const idx = users.findIndex(u => u.username === username)
  if (idx === -1) throw new Error('User not found')
  if (updates.email !== undefined) users[idx].email = updates.email
  if (updates.displayName !== undefined) users[idx].displayName = updates.displayName
  if (updates.password !== undefined) {
    users[idx].passwordHash = await bcrypt.hash(updates.password, 12)
  }
  await writeFile(getFilePath(), JSON.stringify({ users }, null, 2), 'utf-8')
  cachedUsers = null
}
