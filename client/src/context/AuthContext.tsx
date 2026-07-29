// SPDX-License-Identifier: GPL-3.0-or-later
import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import { api, setAuthToken, getStoredUsername, setStoredUsername } from '../lib/api'

interface AuthContextType {
  isAuthenticated: boolean
  username: string | null
  displayName: string | null
  userType: string | null
  canCreatePages: boolean
  hasUsers: boolean | null
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  setup: (username: string, password: string, email?: string) => Promise<void>
  logout: () => void
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

const MAX_RETRIES = 5
const RETRY_DELAY = 1000

async function fetchStatus(retries: number): Promise<{ hasUsers: boolean }> {
  for (let i = 0; i < retries; i++) {
    try {
      return await api.getStatus()
    } catch (err) {
      if (i === retries - 1) throw err
      await new Promise(r => setTimeout(r, RETRY_DELAY))
    }
  }
  throw new Error('Max retries exceeded')
}

let storedDisplayName: string | null = sessionStorage.getItem('nwiki-displayname')

function getStoredDisplayName(): string | null {
  return storedDisplayName
}

function setStoredDisplayName(v: string | null) {
  storedDisplayName = v
  if (v) sessionStorage.setItem('nwiki-displayname', v)
  else sessionStorage.removeItem('nwiki-displayname')
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [username, setUsername] = useState<string | null>(getStoredUsername)
  const [displayName, setDisplayName] = useState<string | null>(getStoredDisplayName)
  const [userType, setUserType] = useState<string | null>(null)
  const [hasUsers, setHasUsers] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetchStatus(MAX_RETRIES)
      .then(data => { if (!cancelled) setHasUsers(data.hasUsers) })
      .catch(() => { if (!cancelled) setHasUsers(true) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const refreshProfile = useCallback(async () => {
    try {
      const profile = await api.getMe()
      setDisplayName(profile.displayName || null)
      setStoredDisplayName(profile.displayName || null)
      setUserType(profile.userType || null)
    } catch { /* ignore */ }
  }, [])

  const login = useCallback(async (user: string, pass: string) => {
    const res = await api.login(user, pass)
    setAuthToken(res.token)
    setStoredUsername(user)
    setUsername(user)
    const name = res.displayName || null
    setDisplayName(name)
    setStoredDisplayName(name)
  }, [])

  const setup = useCallback(async (user: string, pass: string, email?: string) => {
    const res = await api.setup(user, pass, email)
    setAuthToken(res.token)
    setStoredUsername(user)
    setUsername(user)
    const name = res.displayName || null
    setDisplayName(name)
    setStoredDisplayName(name)
    setHasUsers(true)
  }, [])

  const logout = useCallback(() => {
    setAuthToken(null)
    setStoredUsername(null)
    setUsername(null)
    setDisplayName(null)
    setStoredDisplayName(null)
  }, [])

  return (
    <AuthContext.Provider value={{
      isAuthenticated: !!username, username, displayName,
      userType,       canCreatePages: !!username,
      hasUsers, loading,
      login, setup, logout, refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
