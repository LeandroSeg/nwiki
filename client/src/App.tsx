// SPDX-License-Identifier: GPL-3.0-or-later
import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { LanguageProvider, useLang } from './context/LanguageContext'
import { ThemeProvider, useTheme } from './context/ThemeContext'
import { Button } from './components/ui/button'
import PageList from './pages/PageList'
import PageView from './pages/PageView'
import PageEdit from './pages/PageEdit'
import PageSearch from './pages/SearchResults'
import Login from './pages/Login'
import Register from './pages/Register'
import Setup from './pages/Setup'
import Trash from './pages/Trash'
import Settings from './pages/Settings'
import Admin from './pages/Admin'
import MediaManager from './pages/MediaManager'
import SearchBar from './components/SearchBar'
import { api } from './lib/api'

function Header() {
  const { isAuthenticated, username, displayName, logout } = useAuth()
  const { theme, toggle } = useTheme()
  const { t } = useLang()
  const [siteName, setSiteName] = useState(t('nav.home'))
  useEffect(() => {
    api.getConfig().then(c => setSiteName(c.siteName)).catch(() => {})
  }, [])
  return (
    <header className="border-b mb-6">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-2 sm:gap-0">
        <Link to="/" className="text-lg sm:text-xl font-bold shrink-0">{siteName}</Link>
        <div className="flex items-center gap-2 ml-auto">
          <SearchBar />
          {isAuthenticated && (
            <Button variant="ghost" size="sm" className="hidden sm:inline-flex" onClick={toggle} title={t('nav.toggleTheme')}>
              {theme === 'dark' ? '☀' : '☾'}
            </Button>
          )}
          {isAuthenticated ? (
            <>
              <span className="hidden sm:inline text-sm text-muted-foreground">{displayName || username}</span>
              <Link to="/admin" className="hidden sm:inline"><Button variant="ghost" size="sm">{t('nav.admin')}</Button></Link>
              <Link to="/settings" className="hidden sm:inline"><Button variant="ghost" size="sm">{t('nav.settings')}</Button></Link>
              <Button variant="outline" size="sm" onClick={logout} className="text-xs px-2">{t('nav.logout')}</Button>
            </>
          ) : (
            <Link to="/login"><Button variant="outline" size="sm">{t('nav.login')}</Button></Link>
          )}
        </div>
      </div>
    </header>
  )
}

function BootstrapGuard({ children }: { children: React.ReactNode }) {
  const { hasUsers, loading } = useAuth()
  const { t } = useLang()

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">{t('loading')}</div>
  }

  if (hasUsers === false) {
    return <Navigate to="/setup" replace />
  }

  return <>{children}</>
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

function LockedPage({ message }: { message: string }) {
  const { t } = useLang()
  return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <div className="text-center space-y-6 max-w-lg mx-auto px-6 py-12 border-2 border-destructive/30 rounded-xl bg-destructive/5">
        <div className="text-6xl text-destructive">🔒</div>
        <h1 className="text-3xl font-bold text-destructive">{t('lockedPage.title')}</h1>
        <p className="text-lg text-foreground/80 leading-relaxed">
          {message || t('wiki.lockedMessage')}
        </p>
      </div>
    </div>
  )
}

function HomePage() {
  const { t } = useLang()
  const [startPage, setStartPage] = useState<string | null>(null)
  const [configLoaded, setConfigLoaded] = useState(false)

  useEffect(() => {
    api.getConfig()
      .then(cfg => setStartPage(cfg.startPage || null))
      .catch(() => setStartPage(null))
      .finally(() => setConfigLoaded(true))
  }, [])

  if (!configLoaded) {
    return <div className="p-4 text-muted-foreground">{t('loading')}</div>
  }

  if (startPage) {
    return <Navigate to={`/page/${encodeURIComponent(startPage)}`} replace />
  }

  return <PageList />
}

function AppContent() {
  const { t } = useLang()
  const [locked, setLocked] = useState(false)
  const [lockedMsg, setLockedMsg] = useState('')
  const [lockChecked, setLockChecked] = useState(false)

  useEffect(() => {
    api.getConfig()
      .then(c => {
        setLocked(c.locked)
        setLockedMsg(c.lockedMessage)
        if (c.faviconUrl) {
          let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
          if (!link) {
            link = document.createElement('link')
            link.rel = 'icon'
            document.head.appendChild(link)
          }
          const base = window.location.pathname.startsWith('/wiki') ? '/wiki' : ''
          link.href = `${base}${c.faviconUrl}`
        }
      })
      .catch(() => {})
      .finally(() => setLockChecked(true))
  }, [])

  if (!lockChecked) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'system-ui, sans-serif', color: '#888', fontSize: '14px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: 24, height: 24, border: '3px solid #e0e0e0', borderTopColor: '#666', borderRadius: '50%', animation: 's-spin .8s linear infinite' }} />
        <style>{'@keyframes s-spin{to{transform:rotate(360deg)}}'}</style>
        {t('loading')}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 max-w-4xl mx-auto px-4 w-full">
        {locked ? (
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="*" element={<LockedPage message={lockedMsg} />} />
          </Routes>
        ) : (
          <Routes>
            <Route path="/setup" element={<Setup />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/trash" element={<Trash />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/media" element={<MediaManager />} />
            <Route path="/" element={
              <BootstrapGuard>
                <HomePage />
              </BootstrapGuard>
            } />
            <Route path="/search" element={
              <BootstrapGuard>
                <PageSearch />
              </BootstrapGuard>
            } />
            <Route path="/page/*" element={
              <BootstrapGuard>
                <PageView />
              </BootstrapGuard>
            } />
            <Route path="/edit/*" element={
              <BootstrapGuard>
                <AuthGuard>
                  <PageEdit />
                </AuthGuard>
              </BootstrapGuard>
            } />
          </Routes>
        )}
      </main>
      <footer className="text-center text-xs text-muted-foreground/50 py-3 border-t mt-6">
        nwiki — <a href="https://www.gnu.org/licenses/gpl-3.0.html" target="_blank" rel="noopener" className="text-muted-foreground/50 hover:text-muted-foreground">GNU GPL v3</a>
      </footer>
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter basename="/wiki">
        <LanguageProvider>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </LanguageProvider>
      </BrowserRouter>
    </ThemeProvider>
  )
}
