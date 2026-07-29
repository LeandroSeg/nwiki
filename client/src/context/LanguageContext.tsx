// SPDX-License-Identifier: GPL-3.0-or-later
import { createContext, useContext, useState, useCallback, useEffect, useMemo, type ReactNode } from 'react'
import { t as translate, type Lang } from '../i18n/translations'
import { api } from '../lib/api'

interface LangContextType {
  lang: Lang
  t: (key: string, params?: Record<string, string | number>) => string
}

const LangContext = createContext<LangContextType | null>(null)

let cachedLang: Lang = 'pt'

export async function fetchLanguage(): Promise<Lang> {
  try {
    const cfg = await api.getConfig()
    const l = cfg.language as Lang | undefined
    if (l === 'pt' || l === 'en') {
      cachedLang = l
      return l
    }
  } catch { /* use default */ }
  return 'pt'
}

export function getCachedLanguage(): Lang {
  return cachedLang
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(cachedLang)

  useEffect(() => {
    fetchLanguage().then(setLang)
  }, [])

  const tt = useCallback((key: string, params?: Record<string, string | number>) => {
    return translate(lang, key, params)
  }, [lang])

  const value = useMemo(() => ({ lang, t: tt }), [lang, tt])

  return (
    <LangContext.Provider value={value}>
      {children}
    </LangContext.Provider>
  )
}

export function useLang() {
  const ctx = useContext(LangContext)
  if (!ctx) throw new Error('useLang must be used within LanguageProvider')
  return ctx
}
