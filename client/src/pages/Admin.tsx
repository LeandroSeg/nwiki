// SPDX-License-Identifier: GPL-3.0-or-later
import { useEffect, useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useLang } from '../context/LanguageContext'
import { api } from '../lib/api'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card'
import { useTitle } from '../lib/useTitle'

export default function Admin() {
  const { t } = useLang()
  const navigate = useNavigate()
  useTitle('Admin')
  const [tab, setTab] = useState<'settings' | 'users' | 'groups'>('settings')

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex gap-2">
        <Button variant={tab === 'settings' ? 'default' : 'outline'} size="sm" onClick={() => setTab('settings')}>{t('admin.tabSettings')}</Button>
        <Button variant={tab === 'users' ? 'default' : 'outline'} size="sm" onClick={() => setTab('users')}>{t('admin.tabUsers')}</Button>
        <Button variant={tab === 'groups' ? 'default' : 'outline'} size="sm" onClick={() => setTab('groups')}>{t('admin.groups')}</Button>
        <Button variant="outline" size="sm" onClick={() => navigate('/trash')}>{t('nav.trash')}</Button>
        <Link to="/media"><Button variant="outline" size="sm">{t('admin.media')}</Button></Link>
      </div>
      {tab === 'settings' && <SettingsPanel />}
      {tab === 'users' && <UsersPanel />}
      {tab === 'groups' && <GroupsPanel />}
    </div>
  )
}

function SettingsPanel() {
  const { t, lang } = useLang()
  const [siteName, setSiteName] = useState('')
  const [fontSize, setFontSize] = useState(100)
  const [locked, setLocked] = useState(false)
  const [lockMsg, setLockMsg] = useState('')
  const [tokenExp, setTokenExp] = useState('7d')
  const [faviconUrl, setFaviconUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const faviconInputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    api.getAdminConfig()
      .then(cfg => {
        setSiteName(cfg.siteName)
        setFontSize(cfg.defaultFontSize)
        setLocked(cfg.locked)
        setLockMsg(cfg.lockedMessage)
        setTokenExp(cfg.tokenExpiration || '7d')
        setFaviconUrl(cfg.faviconUrl || '')
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setMessage('')
    setSaving(true)
    try {
      await api.updateAdminConfig({
        siteName: siteName.trim(),
        defaultFontSize: fontSize,
        locked,
        lockedMessage: lockMsg.trim(),
        tokenExpiration: tokenExp,
        faviconUrl: faviconUrl.trim(),
      })
      setMessage(t('admin.saved'))
    } catch (err: any) {
      setError(err.message || t('admin.failed'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="text-muted-foreground p-4">{t('admin.loading')}</p>

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('admin.settingsTitle')}</CardTitle>
        <CardDescription>{t('admin.settingsDesc')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('admin.siteName')}</label>
            <Input value={siteName} onChange={e => setSiteName(e.target.value)} placeholder={t('admin.siteNamePlaceholder')} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('admin.fontSize', { size: fontSize })}</label>
            <input type="range" min="60" max="200" value={fontSize} onChange={e => setFontSize(Number(e.target.value))} className="w-full" />
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium">{t('admin.lockWiki')}</label>
            <input type="checkbox" checked={locked} onChange={e => setLocked(e.target.checked)} className="w-4 h-4" />
          </div>
          {locked && (
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('admin.lockMessage')}</label>
              <Input value={lockMsg} onChange={e => setLockMsg(e.target.value)} placeholder={t('admin.lockMessagePlaceholder')} />
            </div>
          )}
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('admin.language')}</label>
            <p className="text-xs text-muted-foreground">{t('admin.languageDesc')}</p>
            <select
              className="w-full border rounded-md px-3 py-2 text-sm"
              value={lang}
              onChange={e => api.updateAdminConfig({ language: e.target.value as 'pt' | 'en' })}
            >
              <option value="pt">{t('admin.langPt')}</option>
              <option value="en">{t('admin.langEn')}</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('admin.tokenExpiration')}</label>
            <p className="text-xs text-muted-foreground">{t('admin.tokenExpirationDesc')}</p>
            <select
              className="w-full border rounded-md px-3 py-2 text-sm"
              value={tokenExp}
              onChange={e => setTokenExp(e.target.value)}
            >
              <option value="1h">1 {t('admin.tokenHour')}</option>
              <option value="6h">6 {t('admin.tokenHours')}</option>
              <option value="12h">12 {t('admin.tokenHours')}</option>
              <option value="24h">24 {t('admin.tokenHours')}</option>
              <option value="2d">2 {t('admin.tokenDays')}</option>
              <option value="3d">3 {t('admin.tokenDays')}</option>
              <option value="7d">7 {t('admin.tokenDays')}</option>
              <option value="14d">14 {t('admin.tokenDays')}</option>
              <option value="30d">30 {t('admin.tokenDays')}</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('admin.faviconUrl')}</label>
            <p className="text-xs text-muted-foreground">{t('admin.faviconUrlDesc')}</p>
            <div className="flex gap-2">
              <Input
                value={faviconUrl}
                onChange={e => setFaviconUrl(e.target.value)}
                placeholder="/api/media/_favicon.png"
                className="flex-1"
              />
              <input
                ref={faviconInputRef}
                type="file"
                accept="image/png,image/gif,image/jpeg,image/webp,image/svg+xml,image/x-icon,image/vnd.microsoft.icon"
                className="hidden"
                disabled={uploading}
                onChange={async e => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  setUploading(true)
                  try {
                    const res = await api.uploadMedia(file)
                    const url = `/api/media/${res.filename}`
                    setFaviconUrl(url)
                  } catch (err: any) {
                    setError(err.message || t('admin.failed'))
                  } finally {
                    setUploading(false)
                    e.target.value = ''
                  }
                }}
              />
              <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => faviconInputRef.current?.click()}>
                {uploading ? t('loading') : t('admin.faviconUpload')}
              </Button>
            </div>
            {faviconUrl && (
              <div className="flex items-center gap-2 pt-1">
                <img src={`${window.location.pathname.startsWith('/wiki') ? '/wiki' : ''}${faviconUrl}`} alt="favicon preview" className="w-6 h-6 border rounded" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                <span className="text-xs text-muted-foreground truncate">{faviconUrl}</span>
              </div>
            )}
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          {message && <p className="text-sm text-green-600">{message}</p>}
          <Button type="submit" disabled={saving}>{saving ? t('saving') : t('admin.saveSettings')}</Button>
        </form>
      </CardContent>
    </Card>
  )
}

function UsersPanel() {
  const { t } = useLang()
  const [users, setUsers] = useState<{ username: string; email: string | null; displayName: string | null; role: string; active: boolean; userType?: string; groups?: string[] }[]>([])
  const [allGroups, setAllGroups] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [msgType, setMsgType] = useState<'ok' | 'err'>('ok')
  const [toggling, setToggling] = useState<string | null>(null)

  function loadUsers() {
    setLoading(true)
    Promise.all([
      api.listUsers(),
      api.listGroups(),
    ]).then(([userData, groupData]) => {
      setUsers(userData.users)
      setAllGroups(groupData.groups)
    }).catch(() => {
      setUsers([])
      setAllGroups([])
    }).finally(() => setLoading(false))
  }

  useEffect(loadUsers, [])

  async function handleToggle(user: { username: string; active: boolean }) {
    setMessage('')
    setToggling(user.username)
    try {
      if (user.active) {
        await api.deactivateUser(user.username)
        setMessage(t('admin.deactivated', { name: user.username }))
        setMsgType('ok')
      } else {
        await api.activateUser(user.username)
        setMessage(t('admin.activated', { name: user.username }))
        setMsgType('ok')
      }
      loadUsers()
    } catch (err: any) {
      setMessage(err.message || t('admin.failed'))
      setMsgType('err')
    } finally {
      setToggling(null)
    }
  }

  if (loading) return <p className="text-muted-foreground p-4">{t('admin.loading')}</p>

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('admin.usersTitle')}</CardTitle>
        <CardDescription>{t('admin.usersDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <Link to="/register"><Button size="sm">{t('nav.addUser')}</Button></Link>
      </CardContent>
      <CardContent>
        {message && <p className={`text-sm mb-3 ${msgType === 'err' ? 'text-red-500' : 'text-green-600'}`}>{message}</p>}
        <div className="space-y-2">
          {users.map(u => (
            <div key={u.username} className="flex flex-col gap-2 p-2 border rounded">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-medium truncate">{u.displayName || u.username}</div>
                  <div className="text-xs text-muted-foreground">
                    {u.username}{u.email ? ` · ${u.email}` : ''} · {u.role} · {u.active ? t('admin.active') : t('admin.inactive')}
                  </div>
                </div>
                <Button size="sm" variant={u.active ? 'outline' : 'default'} onClick={() => handleToggle(u)} disabled={u.role === 'admin' || toggling === u.username}>
                  {u.active ? t('admin.deactivate') : t('admin.activate')}
                </Button>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-muted-foreground">{t('admin.typeA').slice(0, 5)}:</label>
                  <select
                    className="border rounded px-2 py-1 text-xs"
                    value={(u as any).userType || 'B'}
                    onChange={e => { api.updateUserType(u.username, e.target.value).then(() => loadUsers()) }}
                  >
                    <option value="A">{t('admin.typeA')}</option>
                    <option value="B">{t('admin.typeB')}</option>
                    <option value="C">{t('admin.typeC')}</option>
                    <option value="D">{t('admin.typeD')}</option>
                  </select>
                </div>
                <div className="flex items-center gap-1 flex-wrap">
                  {allGroups.map(g => (
                    <label key={g.id} className="flex items-center gap-1 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={(((u as any).groups) || []).includes(g.id)}
                        onChange={e => {
                          const current: string[] = (u as any).groups || []
                          const next = e.target.checked
                            ? [...current, g.id]
                            : current.filter(x => x !== g.id)
                          api.updateUserGroups(u.username, next).then(() => loadUsers())
                        }}
                      />
                      {g.name}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function GroupsPanel() {
  const { t } = useLang()
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [message, setMessage] = useState('')

  function loadGroups() {
    setLoading(true)
    api.listGroups()
      .then(data => setGroups(data.groups))
      .catch(() => setGroups([]))
      .finally(() => setLoading(false))
  }

  useEffect(loadGroups, [])

  async function handleAdd() {
    const name = newName.trim()
    if (!name) return
    setMessage('')
    try {
      await api.createGroup(name)
      setNewName('')
      loadGroups()
    } catch (err: any) {
      setMessage(err.message || t('admin.failed'))
    }
  }

  async function handleRename(id: string) {
    const name = editName.trim()
    if (!name) return
    setMessage('')
    try {
      await api.renameGroup(id, name)
      setEditingId(null)
      setEditName('')
      loadGroups()
    } catch (err: any) {
      setMessage(err.message || t('admin.failed'))
    }
  }

  async function handleDelete(id: string) {
    setMessage('')
    try {
      await api.deleteGroup(id)
      loadGroups()
    } catch (err: any) {
      setMessage(err.message || t('admin.failed'))
    }
  }

  if (loading) return <p className="text-muted-foreground p-4">{t('admin.loading')}</p>

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('admin.groups')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {message && <p className="text-sm text-green-600">{message}</p>}
        <div className="flex gap-2">
          <Input
            placeholder={t('admin.groupName')}
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
          <Button size="sm" onClick={handleAdd}>{t('admin.addGroup')}</Button>
          </div>
          {groups.map(g => (
            <div key={g.id} className="flex items-center justify-between gap-2 p-2 border rounded">
              {editingId === g.id ? (
                <div className="flex gap-2 flex-1">
                  <Input
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleRename(g.id)}
                  />
                  <Button size="sm" onClick={() => handleRename(g.id)}>{t('admin.rename')}</Button>
                  <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>{t('pageEdit.cancel')}</Button>
                </div>
              ) : (
                <>
                  <span className="text-sm font-medium">{g.name}</span>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => { setEditingId(g.id); setEditName(g.name) }}>
                      {t('admin.rename')}
                    </Button>
                    <Button size="sm" variant="destructive" disabled={g.name === 'todos'} onClick={() => handleDelete(g.id)}>
                      {t('admin.delete')}
                    </Button>
                  </div>
                </>
              )}
            </div>
          ))}
      </CardContent>
    </Card>
  )
}
