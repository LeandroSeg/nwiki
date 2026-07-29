// SPDX-License-Identifier: GPL-3.0-or-later
const basePath = window.location.pathname.startsWith('/wiki') ? '/wiki' : ''
const API_BASE = `${basePath}/api`

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

let token: string | null = sessionStorage.getItem('nwiki-token')

export function setAuthToken(t: string | null) {
  token = t
  if (t) {
    sessionStorage.setItem('nwiki-token', t)
  } else {
    sessionStorage.removeItem('nwiki-token')
  }
}

export function getAuthToken(): string | null {
  return token
}

let storedUsername: string | null = sessionStorage.getItem('nwiki-username')

export function setStoredUsername(u: string | null) {
  storedUsername = u
  if (u) {
    sessionStorage.setItem('nwiki-username', u)
  } else {
    sessionStorage.removeItem('nwiki-username')
  }
}

export function getStoredUsername(): string | null {
  return storedUsername
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  if (body && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new ApiError(res.status, err.error || 'Request failed')
  }

  if (res.headers.get('content-type')?.includes('application/json')) {
    return res.json()
  }
  return res.text() as unknown as T
}

export const api = {
  getStatus: () => request<{ hasUsers: boolean }>('GET', '/auth/status'),
  setup: (username: string, password: string, email?: string) =>
    request<{ token: string; username: string; displayName?: string | null }>('POST', '/auth/setup', { username, password, email }),
  login: (username: string, password: string) =>
    request<{ token: string; username: string; displayName?: string | null }>('POST', '/auth/login', { username, password }),
  listPages: () => request<{ pages: string[] }>('GET', '/pages'),
  getPage: (id: string) => request<string>('GET', `/pages/${encodeURIComponent(id)}`),
  createPage: (id: string, content: string) =>
    request<{ success: boolean }>('POST', `/pages/${encodeURIComponent(id)}`, { content }),
  updatePage: (id: string, content: string) =>
    request<{ success: boolean }>('PUT', `/pages/${encodeURIComponent(id)}`, { content }),
  search: (q: string) =>
    request<{ query: string; results: { id: string; score: number; snippet: string }[] }>('GET', `/search?q=${encodeURIComponent(q)}`),

  renderPage: (id: string) => request<string>('GET', `/render/${encodeURIComponent(id)}`),
  renderMarkup: (markup: string) => request<{ html: string }>('POST', '/render', { markup }),

  getConfig: () => request<{ startPage: string; siteName: string; defaultFontSize: number; locked: boolean; lockedMessage: string; language?: string; faviconUrl: string }>('GET', '/config'),

  register: (username: string, password: string, email?: string) =>
    request<{ success: boolean; username: string; pending?: boolean }>('POST', '/auth/register', { username, password, email }),

  listPending: () => request<{ users: { username: string; email?: string }[] }>('GET', '/auth/pending'),

  approveUser: (username: string) =>
    request<{ success: boolean }>('POST', `/auth/approve/${encodeURIComponent(username)}`),

  deletePage: (id: string) =>
    request<{ success: boolean; trashed: boolean }>('DELETE', `/pages/${encodeURIComponent(id)}`),

  listTrash: () => request<{ pages: string[] }>('GET', '/pages/trash/list'),

  restorePage: (id: string) =>
    request<{ success: boolean; restored: boolean }>('POST', `/pages/trash/${encodeURIComponent(id)}/restore`),

  permanentlyDeletePage: (id: string) =>
    request<{ success: boolean; permanentlyDeleted: boolean }>('DELETE', `/pages/trash/${encodeURIComponent(id)}`),

  renderTrashPage: (id: string) => request<string>('GET', `/render/trash/${encodeURIComponent(id)}`),

  getAdminConfig: () => request<{ siteName: string; defaultFontSize: number; locked: boolean; lockedMessage: string; language?: string; tokenExpiration: string; faviconUrl: string }>('GET', '/admin/config'),
  updateAdminConfig: (data: { siteName?: string; defaultFontSize?: number; locked?: boolean; lockedMessage?: string; language?: string; tokenExpiration?: string; faviconUrl?: string }) =>
    request<{ siteName: string; defaultFontSize: number; locked: boolean; lockedMessage: string; language?: string; tokenExpiration: string; faviconUrl: string }>('PUT', '/admin/config', data),
  listUsers: () => request<{ users: { username: string; email: string | null; displayName: string | null; role: string; active: boolean }[] }>('GET', '/admin/users'),
  activateUser: (username: string) => request<{ success: boolean }>('POST', `/admin/users/${encodeURIComponent(username)}/activate`),
  deactivateUser: (username: string) => request<{ success: boolean }>('POST', `/admin/users/${encodeURIComponent(username)}/deactivate`),

  updateProfile: (data: { email?: string; displayName?: string; newPassword?: string; currentPassword?: string }) =>
    request<{ success: boolean }>('PUT', '/auth/profile', data),

  getMe: () => request<{ username: string; email?: string; displayName?: string; userType?: string; groups?: string[] }>('GET', '/auth/me'),

  listGroups: () => request<{ groups: { id: string; name: string }[] }>('GET', '/admin/groups'),
  createGroup: (name: string) => request<{ id: string; name: string }>('POST', '/admin/groups', { name }),
  renameGroup: (id: string, name: string) => request<{ success: boolean }>('PUT', `/admin/groups/${encodeURIComponent(id)}`, { name }),
  deleteGroup: (id: string) => request<{ success: boolean }>('DELETE', `/admin/groups/${encodeURIComponent(id)}`),
  updateUserType: (username: string, userType: string) => request<{ success: boolean }>('PUT', `/admin/users/${encodeURIComponent(username)}/type`, { userType }),
  updateUserGroups: (username: string, groups: string[]) => request<{ success: boolean }>('PUT', `/admin/users/${encodeURIComponent(username)}/groups`, { groups }),
  getPageGroups: (id: string) => request<{ pageId: string; groups: string[] }>('GET', `/pages/${encodeURIComponent(id)}/groups`),
  setPageGroups: (id: string, groups: string[]) => request<{ success: boolean }>('PUT', `/pages/${encodeURIComponent(id)}/groups`, { groups }),

  listMedia: (dir?: string) => request<{ files: { name: string; isDir: boolean; size: number; modified: string; type: string }[] }>('GET', `/media${dir ? `?dir=${encodeURIComponent(dir)}` : ''}`),
  uploadMedia: (file: File, path?: string) => {
    const form = new FormData()
    form.append('file', file)
    if (path) form.append('path', path)
    return request<{ success: boolean; filename: string }>('POST', '/media', form)
  },
  deleteMedia: (filename: string) => request<{ success: boolean }>('DELETE', `/media/${encodeURIComponent(filename)}`),
}
