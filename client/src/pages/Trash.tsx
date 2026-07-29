// SPDX-License-Identifier: GPL-3.0-or-later
import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useLang } from '../context/LanguageContext'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import SanitizedContent from '../components/SanitizedContent'
import { useTitle } from '../lib/useTitle'

export default function Trash() {
  const { t } = useLang()
  useTitle('Trash')
  const [pages, setPages] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [previewId, setPreviewId] = useState<string | null>(null)
  const [previewContent, setPreviewContent] = useState('')
  const [previewLoading, setPreviewLoading] = useState(false)

  function loadTrash() {
    setLoading(true)
    api.listTrash()
      .then(data => setPages(data.pages))
      .catch(() => setPages([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadTrash()
    const onFocus = () => loadTrash()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])

  async function handlePreview(id: string) {
    setPreviewId(id)
    setPreviewLoading(true)
    setPreviewContent('')
    try {
      const html = await api.renderTrashPage(id)
      setPreviewContent(html)
    } catch {
      setPreviewContent(`<p>${t('trash.errorPreview')}</p>`)
    } finally {
      setPreviewLoading(false)
    }
  }

  function handleBack() {
    setPreviewId(null)
    setPreviewContent('')
  }

  async function handleRestore(id: string) {
    try {
      await api.restorePage(id)
      setMessage(t('trash.restored', { id }))
      handleBack()
      loadTrash()
    } catch (err: any) {
      setMessage(err.message || t('trash.failedRestore'))
    }
  }

  async function handlePermanentDelete(id: string) {
    if (!confirm(t('trash.confirmPermanent', { id }))) return
    try {
      await api.permanentlyDeletePage(id)
      setMessage(t('trash.deleted', { id }))
      handleBack()
      loadTrash()
    } catch (err: any) {
      setMessage(err.message || t('trash.failedDelete'))
    }
  }

  if (loading) return <div className="p-4 text-muted-foreground">{t('loadingTrash')}</div>

  if (previewId) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{previewId}</h1>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => handleRestore(previewId)}>{t('trash.restore')}</Button>
            <Button size="sm" variant="outline" onClick={() => handlePermanentDelete(previewId)}>{t('trash.delete')}</Button>
            <Button variant="ghost" size="sm" onClick={handleBack}>{t('trash.back')}</Button>
          </div>
        </div>
        <Card>
          <CardContent className="p-4">
            {previewLoading ? (
              <p className="text-muted-foreground">{t('loading')}</p>
            ) : (
              <SanitizedContent content={previewContent} isHtml />
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('trash.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        {message && <p className="text-sm text-green-600 mb-3">{message}</p>}
        {pages.length === 0 ? (
          <p className="text-muted-foreground">{t('trash.empty')}</p>
        ) : (
          <ul className="space-y-2">
            {pages.map(id => (
              <li key={id} className="flex items-center justify-between gap-2">
                <button
                  onClick={() => handlePreview(id)}
                  className="text-blue-600 hover:underline truncate text-left cursor-pointer"
                >
                  {id}
                </button>
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" onClick={() => handleRestore(id)}>{t('trash.restore')}</Button>
                  <Button size="sm" variant="outline" onClick={() => handlePermanentDelete(id)}>{t('trash.delete')}</Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
