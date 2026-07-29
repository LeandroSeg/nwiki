// SPDX-License-Identifier: GPL-3.0-or-later
import { useState } from 'react'
import { api } from '../lib/api'
import { useLang } from '../context/LanguageContext'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card'
import { useTitle } from '../lib/useTitle'

export default function Register() {
  const { t } = useLang()
  useTitle('Register')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (username.length < 3) {
      setError(t('register.errUsernameLen'))
      return
    }
    if (password.length < 8) {
      setError(t('register.errPasswordLen'))
      return
    }
    if (password !== confirm) {
      setError(t('register.errPasswordsMatch'))
      return
    }

    setLoading(true)
    try {
      await api.register(username, password, email || undefined)
      setSuccess(t('register.success', { username }))
      setUsername('')
      setPassword('')
      setConfirm('')
      setEmail('')
    } catch (err: any) {
      if (err.status === 409) {
        setError(t('register.errExists'))
      } else {
        setError(err.message || t('register.failed'))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{t('register.title')}</CardTitle>
          <CardDescription>{t('register.desc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-medium">{t('register.username')}</label>
              <Input id="username" value={username} onChange={e => setUsername(e.target.value)} required minLength={3} />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">{t('register.password')}</label>
              <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} />
            </div>
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">{t('register.email')}</label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={t('register.emailPlaceholder')} />
            </div>
            <div className="space-y-2">
              <label htmlFor="confirm" className="text-sm font-medium">{t('register.confirmPassword')}</label>
              <Input id="confirm" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            {success && <p className="text-sm text-green-600">{success}</p>}
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? t('creating') : t('register.create')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
