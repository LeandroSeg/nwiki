// SPDX-License-Identifier: GPL-3.0-or-later
import { useEffect, useState, useRef, useMemo } from 'react'
import { useLang } from '../context/LanguageContext'
import { api } from '../lib/api'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { useTitle } from '../lib/useTitle'
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

export default function MediaManager() {
  const { t } = useLang()
  useTitle(t('media.title'))
  const [files, setFiles] = useState<MediaFile[]>([])
  const [loading, setLoading] = useState(true)
  const [currentDir, setCurrentDir] = useState('')
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function loadFiles() {
    setLoading(true)
    api.listMedia(currentDir || undefined)
      .then(data => setFiles(data.files || []))
      .catch(() => setFiles([]))
      .finally(() => setLoading(false))
  }

  useEffect(loadFiles, [currentDir])

  const dirs = useMemo(() => files.filter(f => f.isDir).sort((a, b) => a.name.localeCompare(b.name)), [files])
  const items = useMemo(() => files.filter(f => !f.isDir).sort((a, b) => a.name.localeCompare(b.name)), [files])

  const segments = currentDir ? currentDir.split('/') : []

  async function handleUpload() {
    if (!uploadFile) return
    setUploading(true)
    try {
      const targetPath = currentDir ? `${currentDir}/${uploadFile.name}` : uploadFile.name
      const formData = new FormData()
      formData.append('file', uploadFile)
      formData.append('path', targetPath)
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

  async function handleDelete(name: string) {
    if (!confirm(t('media.confirmDelete', { name }))) return
    try {
      await api.deleteMedia(name)
      loadFiles()
    } catch {
      alert('Delete failed')
    }
  }

  function handleCopy(name: string) {
    navigator.clipboard.writeText(`{{:${name}|}}`)
    setCopied(name)
    setTimeout(() => setCopied(null), 1500)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
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

      <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3 p-4 border rounded-lg">
        <div className="space-y-1">
          <label className="text-sm font-medium">{t('media.uploadFile')}</label>
          <Input ref={fileInputRef} type="file" onChange={e => setUploadFile(e.target.files?.[0] || null)} />
        </div>
        <Button onClick={handleUpload} disabled={!uploadFile || uploading}>
          {uploading ? t('uploading') : t('media.upload')}
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">{t('media.loading')}</p>
      ) : dirs.length === 0 && files.length === 0 ? (
        <p className="text-muted-foreground">{t('media.empty')}</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {dirs.map(d => {
            const dirName = d.name.includes('/') ? d.name.split('/').pop()! : d.name
            return (
            <button key={d.name} onClick={() => setCurrentDir(d.name)} className="border rounded-lg p-3 space-y-2 hover:bg-muted/50 cursor-pointer text-left transition-colors">
              <div className="flex items-center justify-center bg-muted rounded h-32">
                <span className="text-5xl text-muted-foreground/60">📁</span>
              </div>
              <div className="text-sm truncate font-medium" title={d.name}>{dirName}</div>
              <div className="text-xs text-muted-foreground">{t('media.folder')}</div>
            </button>
            )})}
          {items.map(f =>
            (() => {
              const base = f.name.includes('/') ? f.name.split('/').pop()! : f.name
              return (
              <div key={f.name} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-center bg-muted rounded h-32 overflow-hidden">
                  {IMAGE_EXTS.has(f.type) ? (
                    <img src={`/wiki/api/media/${f.name}`} alt={f.name} className="max-h-32 object-contain" />
                  ) : (
                    <span className="text-3xl font-bold text-muted-foreground uppercase">
                      {f.type.replace('.', '') || '?'}
                    </span>
                  )}
                </div>
                <div className="text-sm truncate" title={f.name}>{base}</div>
                <div className="text-xs text-muted-foreground">{formatSize(f.size)} · {f.type.replace('.', '') || '?'}</div>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => handleCopy(f.name)}>
                    {copied === f.name ? t('media.copied') : t('media.copyEmbed')}
                  </Button>
                  <Button size="sm" variant="destructive" className="text-xs" onClick={() => handleDelete(f.name)}>
                    {t('media.delete')}
                  </Button>
                </div>
              </div>
            )})()
          )}
        </div>
      )}
    </div>
  )
}
