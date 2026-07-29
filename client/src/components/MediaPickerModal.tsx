// SPDX-License-Identifier: GPL-3.0-or-later
import { useEffect, useState, useRef, useMemo } from 'react'
import { api } from '../lib/api'
import { useLang } from '../context/LanguageContext'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { ArrowUp } from 'lucide-react'

interface MediaFile {
  name: string
  isDir: boolean
  size: number
  modified: string
  type: string
}

const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff'])

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

interface Props {
  open: boolean
  onPick: (embedCode: string) => void
  onClose: () => void
}

export default function MediaPickerModal({ open, onPick, onClose }: Props) {
  const { t } = useLang()
  const [files, setFiles] = useState<MediaFile[]>([])
  const [loading, setLoading] = useState(true)
  const [currentDir, setCurrentDir] = useState('')
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function loadFiles() {
    if (!open) return
    setLoading(true)
    api.listMedia(currentDir || undefined)
      .then(data => setFiles(data.files || []))
      .catch(() => setFiles([]))
      .finally(() => setLoading(false))
  }

  useEffect(loadFiles, [currentDir, open])

  const dirs = useMemo(() => files.filter(f => f.isDir).sort((a, b) => a.name.localeCompare(b.name)), [files])
  const items = useMemo(() => files.filter(f => !f.isDir).sort((a, b) => a.name.localeCompare(b.name)), [files])
  const segments = currentDir ? currentDir.split('/') : []

  async function handleUpload() {
    if (!uploadFile) return
    setUploading(true)
    try {
      const targetPath = currentDir ? `${currentDir}/${uploadFile.name}` : uploadFile.name
      await api.uploadMedia(uploadFile, targetPath)
      setUploadFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      loadFiles()
    } catch {
      alert('Upload failed')
    } finally {
      setUploading(false)
    }
  }

  function handlePickFile(name: string) {
    onPick(`{{:${name}|}}`)
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-[var(--card)] border rounded-lg shadow-xl max-w-4xl w-full max-h-[85vh] flex flex-col m-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b shrink-0">
          <div className="flex items-center gap-2 text-sm">
            {currentDir && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setCurrentDir(segments.length > 1 ? segments.slice(0, -1).join('/') : '')}
                title={t('media.up')}
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </Button>
            )}
            <button onClick={() => setCurrentDir('')} className="hover:underline text-muted-foreground hover:text-foreground cursor-pointer">
              {t('media.title')}
            </button>
            {segments.map((seg, i) => (
              <span key={i} className="flex items-center gap-1">
                <span className="text-muted-foreground/50">›</span>
                {i === segments.length - 1 ? (
                  <span className="font-medium text-foreground">{seg}</span>
                ) : (
                  <button onClick={() => setCurrentDir(segments.slice(0, i + 1).join('/'))} className="hover:underline text-muted-foreground hover:text-foreground cursor-pointer">
                    {seg}
                  </button>
                )}
              </span>
            ))}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>{t('pageEdit.helpClose')}</Button>
        </div>

        <div className="p-4 border-b shrink-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">{t('media.uploadFile')}</label>
              <Input ref={fileInputRef} type="file" onChange={e => setUploadFile(e.target.files?.[0] || null)} />
            </div>
            <Button onClick={handleUpload} disabled={!uploadFile || uploading}>
              {uploading ? t('uploading') : t('media.upload')}
            </Button>
          </div>
        </div>

        <div className="p-4 overflow-y-auto grow">
          {loading ? (
            <p className="text-muted-foreground">{t('media.loading')}</p>
          ) : dirs.length === 0 && items.length === 0 ? (
            <p className="text-muted-foreground">{t('media.empty')}</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {dirs.map(d => {
                const dirName = d.name.includes('/') ? d.name.split('/').pop()! : d.name
                return (
                <button key={d.name} onClick={() => setCurrentDir(d.name)} className="border rounded-lg p-3 space-y-2 hover:bg-muted/50 cursor-pointer text-left transition-colors">
                  <div className="flex items-center justify-center bg-muted rounded h-24">
                    <span className="text-4xl text-muted-foreground/60">📁</span>
                  </div>
                  <div className="text-sm truncate font-medium" title={d.name}>{dirName}</div>
                  <div className="text-xs text-muted-foreground">{t('media.folder')}</div>
                </button>
                )})}
              {items.map(f => {
                const base = f.name.includes('/') ? f.name.split('/').pop()! : f.name
                return (
                <button key={f.name} onClick={() => handlePickFile(f.name)} className="border rounded-lg p-3 space-y-2 hover:bg-muted/50 cursor-pointer text-left transition-colors">
                  <div className="flex items-center justify-center bg-muted rounded h-24 overflow-hidden">
                    {IMAGE_EXTS.has(f.type) ? (
                      <img src={`/wiki/api/media/${f.name}`} alt={f.name} className="max-h-24 object-contain" />
                    ) : (
                      <span className="text-3xl font-bold text-muted-foreground uppercase">
                        {f.type.replace('.', '') || '?'}
                      </span>
                    )}
                  </div>
                  <div className="text-sm truncate" title={f.name}>{base}</div>
                  <div className="text-xs text-muted-foreground">{formatSize(f.size)}</div>
                </button>
                )})}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
