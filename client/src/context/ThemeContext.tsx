// SPDX-License-Identifier: GPL-3.0-or-later
import { createContext, useContext, useState, useCallback, useEffect, useMemo, type ReactNode } from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextType {
  theme: Theme
  toggle: () => void
  fontSize: number
  increaseFont: () => void
  decreaseFont: () => void
  resetFont: () => void
}

const ThemeContext = createContext<ThemeContextType | null>(null)

const FONT_MIN = 0.8
const FONT_MAX = 1.4
const FONT_STEP = 0.1

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'light'
  const stored = localStorage.getItem('nwiki-theme')
  if (stored === 'light' || stored === 'dark') return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function getInitialFontSize(): number {
  if (typeof window === 'undefined') return 1
  const stored = localStorage.getItem('nwiki-font-size')
  if (stored) {
    const n = parseFloat(stored)
    if (!isNaN(n) && n >= FONT_MIN && n <= FONT_MAX) return n
  }
  return 1
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)
  const [fontSize, setFontSize] = useState<number>(getInitialFontSize)

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('nwiki-theme', theme)
  }, [theme])

  useEffect(() => {
    document.documentElement.style.fontSize = `${fontSize * 100}%`
    localStorage.setItem('nwiki-font-size', String(fontSize))
  }, [fontSize])

  const toggle = useCallback(() => {
    setTheme(t => (t === 'light' ? 'dark' : 'light'))
  }, [])

  const increaseFont = useCallback(() => {
    setFontSize(f => Math.min(FONT_MAX, Math.round((f + FONT_STEP) * 100) / 100))
  }, [])

  const decreaseFont = useCallback(() => {
    setFontSize(f => Math.max(FONT_MIN, Math.round((f - FONT_STEP) * 100) / 100))
  }, [])

  const resetFont = useCallback(() => {
    setFontSize(1)
  }, [])

  const value = useMemo(() => ({
    theme, toggle, fontSize, increaseFont, decreaseFont, resetFont,
  }), [theme, fontSize, toggle, increaseFont, decreaseFont, resetFont])

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
