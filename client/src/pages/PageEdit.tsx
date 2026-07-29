// SPDX-License-Identifier: GPL-3.0-or-later
import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useLang } from '../context/LanguageContext'
import { Button } from '../components/ui/button'
import { useTitle } from '../lib/useTitle'
import FormatHelp from '../components/FormatHelp'
import FormatToolbar from '../components/FormatToolbar'
import PreviewDialog from '../components/PreviewDialog'
import MediaPickerModal from '../components/MediaPickerModal'
import { Card, CardContent } from '../components/ui/card'

export default function PageEdit() {
  const { t } = useLang()
  const id = useParams()['*'] || ''
  useTitle('Edit: ' + id)
  const navigate = useNavigate()
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isNew, setIsNew] = useState(false)
  const [forbidden, setForbidden] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [showMediaPicker, setShowMediaPicker] = useState(false)
  const [toolbarOrientation, setToolbarOrientation] = useState<'horizontal' | 'vertical'>(() => {
    return (localStorage.getItem('nwiki-toolbar-orientation') as 'horizontal' | 'vertical') || 'horizontal'
  })

  function toggleOrientation() {
    setToolbarOrientation(prev => {
      const next = prev === 'horizontal' ? 'vertical' : 'horizontal'
      localStorage.setItem('nwiki-toolbar-orientation', next)
      return next
    })
  }

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)')
    if (mq.matches && toolbarOrientation === 'vertical') {
      setToolbarOrientation('horizontal')
      localStorage.setItem('nwiki-toolbar-orientation', 'horizontal')
    }
    const handler = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setToolbarOrientation('horizontal')
        localStorage.setItem('nwiki-toolbar-orientation', 'horizontal')
      }
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([])
  const [pageGroups, setPageGroups] = useState<string[]>([])

  useEffect(() => {
    if (!id) return
    let cancelled = false
    api.getPage(id)
      .then(data => { if (!cancelled) { setContent(data); setIsNew(false) }})
      .catch(err => { if (!cancelled) { if (err.status === 403) setForbidden(true); else setIsNew(true) }})
      .finally(() => { if (!cancelled) setLoading(false) })
    api.listGroups()
      .then(data => { if (!cancelled) setGroups(data.groups) })
      .catch(() => {})
    api.getPageGroups(id)
      .then(data => { if (!cancelled) setPageGroups(data.groups) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [id])

  async function handleSave() {
    if (!id) return
    setSaving(true)
    try {
      if (isNew) {
        await api.createPage(id, content)
      } else {
        await api.updatePage(id, content)
      }
      await api.setPageGroups(id, pageGroups)
      navigate(`/page/${encodeURIComponent(id)}`)
    } catch (err: any) {
      alert(err.message || t('pageEdit.failedSave'))
    } finally {
      setSaving(false)
    }
  }

  function insertAtCursor(text: string) {
    const ta = textareaRef.current
    if (!ta) return
    const scrollTop = ta.scrollTop
    const start = ta.selectionStart
    const before = ta.value.substring(0, start)
    const after = ta.value.substring(ta.selectionEnd)
    const newContent = before + text + after
    setContent(newContent)
    requestAnimationFrame(() => {
      ta.focus({ preventScroll: true })
      ta.setSelectionRange(start + text.length, start + text.length)
      ta.scrollTop = scrollTop
    })
  }

  function handleFormat(fn: (value: string, start: number, end: number) => { value: string; selStart: number; selEnd: number }) {
    const ta = textareaRef.current
    if (!ta) return
    const scrollTop = ta.scrollTop
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const result = fn(ta.value, start, end)
    setContent(result.value)
    requestAnimationFrame(() => {
      ta.focus({ preventScroll: true })
      ta.setSelectionRange(result.selStart, result.selEnd)
      ta.scrollTop = scrollTop
    })
  }

  async function handleDelete() {
    if (!id || isNew) return
    if (!confirm(t('pageEdit.confirmDelete', { id }))) return
    try {
      await api.deletePage(id)
      navigate(-1)
    } catch (err: any) {
      alert(err.message || t('pageEdit.failedDelete'))
    }
  }

  if (loading) return <div className="p-4 text-muted-foreground">{t('loading')}</div>
  if (forbidden) return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">{t('pageView.noAccess')}</h1>
      <Link to={`/page/${encodeURIComponent(id)}`} className="text-blue-600 hover:underline">{t('pageView.backHome')}</Link>
    </div>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">{isNew ? t('pageEdit.titleCreate') : t('pageEdit.titleEdit', { id })}</h1>
      </div>
      <Card>
        <CardContent className="p-4">
          {toolbarOrientation === 'vertical' ? (
            <div className="flex gap-3 items-start">
              <div className="flex-1 space-y-4 min-w-0">
                <textarea
                  ref={textareaRef}
                  className="w-full min-h-[40vh] sm:h-[55vh] p-3 border rounded-md font-mono text-sm resize-y"
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder={t('pageEdit.placeholder')}
                />
                {groups.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Access Groups</label>
                    <div className="flex gap-3 flex-wrap">
                      {groups.map(g => (
                        <label key={g.id} className="flex items-center gap-1 text-sm cursor-pointer">
                          <input
                            type="checkbox"
                            checked={pageGroups.includes(g.id)}
                            onChange={e => {
                              setPageGroups(prev =>
                                e.target.checked ? [...prev, g.id] : prev.filter(x => x !== g.id)
                              )
                            }}
                          />
                          {g.name}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex gap-2 flex-wrap">
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? t('saving') : t('pageEdit.save')}
                  </Button>
                  <Button variant="outline" onClick={() => navigate(-1)}>{t('pageEdit.cancel')}</Button>
                  {!isNew && (
                    <Button variant="destructive" onClick={handleDelete} className="sm:ml-auto">
                      {t('pageEdit.delete')}
                    </Button>
                  )}
                </div>
              </div>
              <FormatToolbar
                textareaRef={textareaRef}
                onMediaClick={() => setShowMediaPicker(true)}
                onHelpClick={() => setShowHelp(true)}
                onPreviewClick={() => setShowPreview(true)}
                orientation="vertical"
                onToggleOrientation={toggleOrientation}
                onFormat={handleFormat}
              />
            </div>
          ) : (
            <div className="space-y-4">
              <FormatToolbar
                textareaRef={textareaRef}
                onMediaClick={() => setShowMediaPicker(true)}
                onHelpClick={() => setShowHelp(true)}
                onPreviewClick={() => setShowPreview(true)}
                orientation="horizontal"
                onToggleOrientation={toggleOrientation}
                onFormat={handleFormat}
              />
              <textarea
                ref={textareaRef}
                className="w-full min-h-[40vh] sm:h-[55vh] p-3 border rounded-md font-mono text-sm resize-y"
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder={t('pageEdit.placeholder')}
              />
              {groups.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Access Groups</label>
                  <div className="flex gap-3 flex-wrap">
                    {groups.map(g => (
                      <label key={g.id} className="flex items-center gap-1 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={pageGroups.includes(g.id)}
                          onChange={e => {
                            setPageGroups(prev =>
                              e.target.checked ? [...prev, g.id] : prev.filter(x => x !== g.id)
                            )
                          }}
                        />
                        {g.name}
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-2 flex-wrap">
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? t('saving') : t('pageEdit.save')}
                </Button>
                <Button variant="outline" onClick={() => navigate(-1)}>{t('pageEdit.cancel')}</Button>
                {!isNew && (
                  <Button variant="destructive" onClick={handleDelete} className="sm:ml-auto">
                    {t('pageEdit.delete')}
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      <FormatHelp open={showHelp} onClose={() => setShowHelp(false)} />
      <PreviewDialog open={showPreview} content={content} onClose={() => setShowPreview(false)} />
      <MediaPickerModal open={showMediaPicker} onPick={insertAtCursor} onClose={() => setShowMediaPicker(false)} />
    </div>
  )
}
