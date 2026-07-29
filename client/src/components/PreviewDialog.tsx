// SPDX-License-Identifier: GPL-3.0-or-later
import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useLang } from '../context/LanguageContext'
import { Button } from './ui/button'
import SanitizedContent from './SanitizedContent'

interface Props {
  open: boolean
  content: string
  onClose: () => void
}

export default function PreviewDialog({ open, content, onClose }: Props) {
  const { t } = useLang()
  const [html, setHtml] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setLoading(true)
    setError('')
    api.renderMarkup(content)
      .then(res => setHtml(res.html))
      .catch(err => setError(err.message || t('error.generic')))
      .finally(() => setLoading(false))
  }, [open, content, t])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-[var(--card)] border rounded-lg shadow-xl max-w-3xl w-full max-h-[85vh] flex flex-col m-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b shrink-0">
          <h2 className="text-lg font-bold">{t('pageEdit.preview')}</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>{t('pageEdit.helpClose')}</Button>
        </div>
        <div className="p-4 overflow-y-auto grow">
          {loading && <p className="text-muted-foreground">{t('loading')}</p>}
          {error && <p className="text-destructive">{error}</p>}
          {!loading && !error && <SanitizedContent content={html} isHtml />}
        </div>
      </div>
    </div>
  )
}
