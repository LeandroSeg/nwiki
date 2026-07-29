// SPDX-License-Identifier: GPL-3.0-or-later
import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTitle } from '../lib/useTitle'
import { useLang } from '../context/LanguageContext'
import { api } from '../lib/api'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import SanitizedContent from '../components/SanitizedContent'

export default function PageView() {
  const { t } = useLang()
  const id = useParams()['*'] || ''
  useTitle(id)
  const { isAuthenticated, canCreatePages } = useAuth()
  const navigate = useNavigate()
  const [html, setHtml] = useState('')
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [subPages, setSubPages] = useState<string[]>([])
  const [forbidden, setForbidden] = useState(false)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    setNotFound(false)
    setForbidden(false)
    setSubPages([])
    api.renderPage(id)
      .then(setHtml)
      .catch(err => {
        if (err.status === 404) {
          setNotFound(true)
          api.listPages().then(data => {
            const prefix = id + '/'
            setSubPages(data.pages.filter(p => p.startsWith(prefix)))
          }).catch(() => {})
        } else if (err.status === 403) {
          setForbidden(true)
        } else {
          setHtml(`<p>${t('pageView.errorLoading')}</p>`)
        }
      })
      .finally(() => setLoading(false))
  }, [id])

  const segments = id ? id.split('/') : []

  function handleBreadcrumbClick(path: string) {
    navigate(`/page/${encodeURIComponent(path)}`)
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px', color: '#888', fontSize: '14px', fontFamily: 'system-ui, sans-serif', gap: '8px' }}>
      <div style={{ width: 16, height: 16, border: '2px solid #e0e0e0', borderTopColor: '#666', borderRadius: '50%', animation: 'sp .6s linear infinite' }} />
      <style>{'@keyframes sp{to{transform:rotate(360deg)}}'}</style>
      {t('loading')}
    </div>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <nav className="text-sm text-muted-foreground flex items-center gap-1 flex-wrap">
          {segments.map((seg, i) => {
            const path = segments.slice(0, i + 1).join('/')
            const isLast = i === segments.length - 1
            return (
              <span key={path} className="flex items-center gap-1">
                {i > 0 && <span className="text-muted-foreground/50">›</span>}
                <button onClick={() => handleBreadcrumbClick(path)} className={`hover:underline transition-colors cursor-pointer ${isLast ? 'font-medium text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                  {seg}
                </button>
              </span>
            )
          })}
        </nav>
        {isAuthenticated && !notFound && (
          <Link to={`/edit/${encodeURIComponent(id)}`}>
            <Button variant="outline" size="sm">{t('pageView.edit')}</Button>
          </Link>
        )}
      </div>

      {forbidden ? (
        <Card>
          <CardContent className="p-4">
            <p>{t('pageView.noAccess')}</p>
          </CardContent>
        </Card>
      ) : notFound ? (
        <Card>
          <CardContent className="p-4">
            <p className="text-muted-foreground mb-3">{t('pageView.notFound')}</p>
            {canCreatePages && (
              <div className="mb-4">
                <Button onClick={() => navigate(`/edit/${encodeURIComponent(id)}`)} size="sm">
                  {t('pageEdit.titleCreate')}
                </Button>
              </div>
            )}
            {subPages.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">{t('pageList.title')}</p>
                <ul className="space-y-1">
                  {subPages.map(sp => (
                    <li key={sp}>
                      <Link to={`/page/${encodeURIComponent(sp)}`} className="text-blue-600 hover:underline text-sm">
                        {sp}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-4">
            <SanitizedContent content={html} isHtml />
          </CardContent>
        </Card>
      )}

      <Link to="/" className="text-blue-600 hover:underline mt-4 inline-block">{t('pageView.backHome')}</Link>
    </div>
  )
}
