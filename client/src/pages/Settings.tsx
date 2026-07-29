// SPDX-License-Identifier: GPL-3.0-or-later
import { useState } from 'react'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LanguageContext'
import { api } from '../lib/api'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card'
import { useTitle } from '../lib/useTitle'

export default function Settings() {
  const { t } = useLang()
  useTitle('Settings')
  const { fontSize, increaseFont, decreaseFont, resetFont } = useTheme()
  const { username, displayName, refreshProfile } = useAuth()

  const [dispName, setDispName] = useState('')
  const [nameMsg, setNameMsg] = useState('')
  const [nameErr, setNameErr] = useState('')
  const [nameSaving, setNameSaving] = useState(false)

  const [email, setEmail] = useState('')
  const [emailMsg, setEmailMsg] = useState('')
  const [emailErr, setEmailErr] = useState('')
  const [emailSaving, setEmailSaving] = useState(false)

  const [curPass, setCurPass] = useState('')
  const [newPass, setNewPass] = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [passMsg, setPassMsg] = useState('')
  const [passErr, setPassErr] = useState('')
  const [passSaving, setPassSaving] = useState(false)

  async function handleDisplayName(e: React.FormEvent) {
    e.preventDefault()
    setNameErr('')
    setNameMsg('')
    if (!dispName.trim()) { setNameErr(t('settings.displayNameErr')); return }
    setNameSaving(true)
    try {
      await api.updateProfile({ displayName: dispName.trim() })
      setNameMsg(t('settings.displayNameSaved'))
      await refreshProfile()
      setDispName('')
    } catch (err: any) {
      setNameErr(err.message || t('settings.failed'))
    } finally {
      setNameSaving(false)
    }
  }

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault()
    setEmailErr('')
    setEmailMsg('')
    if (!email.trim()) { setEmailErr(t('settings.emailErr')); return }
    setEmailSaving(true)
    try {
      await api.updateProfile({ email: email.trim() })
      setEmailMsg(t('settings.emailSaved'))
      setEmail('')
    } catch (err: any) {
      setEmailErr(err.message || t('settings.failed'))
    } finally {
      setEmailSaving(false)
    }
  }

  async function handlePassword(e: React.FormEvent) {
    e.preventDefault()
    setPassErr('')
    setPassMsg('')
    if (!curPass) { setPassErr(t('settings.passwordErrCurrent')); return }
    if (newPass.length < 8) { setPassErr(t('settings.passwordErrLength')); return }
    if (newPass !== confirmPass) { setPassErr(t('settings.passwordErrMatch')); return }
    setPassSaving(true)
    try {
      await api.updateProfile({ newPassword: newPass, currentPassword: curPass })
      setPassMsg(t('settings.passwordChanged'))
      setCurPass('')
      setNewPass('')
      setConfirmPass('')
    } catch (err: any) {
      setPassErr(err.message || t('settings.failed'))
    } finally {
      setPassSaving(false)
    }
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('settings.title')}</CardTitle>
          <CardDescription>{t('settings.desc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-sm font-medium mb-2">{t('settings.fontSize')}</h3>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={decreaseFont} disabled={fontSize <= 0.8}>{t('settings.fontDecrease')}</Button>
              <span className="text-sm w-12 text-center tabular-nums">{Math.round(fontSize * 100)}%</span>
              <Button variant="outline" size="sm" onClick={increaseFont} disabled={fontSize >= 1.4}>{t('settings.fontIncrease')}</Button>
              <Button variant="ghost" size="sm" onClick={resetFont}>{t('settings.fontReset')}</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('settings.displayName')}</CardTitle>
          <CardDescription>{t('settings.displayNameDesc', { name: displayName || username || '' })}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleDisplayName} className="space-y-3">
            <Input id="displayName" value={dispName} onChange={e => setDispName(e.target.value)} placeholder={t('settings.displayNamePlaceholder')} autoComplete="off" />
            {nameErr && <p className="text-sm text-red-500">{nameErr}</p>}
            {nameMsg && <p className="text-sm text-green-600">{nameMsg}</p>}
            <Button type="submit" disabled={nameSaving}>{nameSaving ? t('saving') : t('settings.saveName')}</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('settings.email')}</CardTitle>
          <CardDescription>{t('settings.emailDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleEmail} className="space-y-3">
            <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={t('settings.emailPlaceholder')} autoComplete="email" />
            {emailErr && <p className="text-sm text-red-500">{emailErr}</p>}
            {emailMsg && <p className="text-sm text-green-600">{emailMsg}</p>}
            <Button type="submit" disabled={emailSaving}>{emailSaving ? t('saving') : t('settings.saveEmail')}</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('settings.changePassword')}</CardTitle>
          <CardDescription>{t('settings.changePasswordDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePassword} className="space-y-3">
            <Input type="password" value={curPass} onChange={e => setCurPass(e.target.value)} placeholder={t('settings.currentPassword')} autoComplete="off" />
            <Input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} placeholder={t('settings.newPassword')} autoComplete="new-password" />
            <Input type="password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} placeholder={t('settings.confirmNewPassword')} autoComplete="new-password" />
            {passErr && <p className="text-sm text-red-500">{passErr}</p>}
            {passMsg && <p className="text-sm text-green-600">{passMsg}</p>}
            <Button type="submit" disabled={passSaving}>{passSaving ? t('changing') : t('settings.changePassword')}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
