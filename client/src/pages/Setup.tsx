// SPDX-License-Identifier: GPL-3.0-or-later
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LanguageContext'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card'
import { useTitle } from '../lib/useTitle'

export default function Setup() {
  const { t } = useLang()
  useTitle('Setup')
  const { setup } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (username.length < 3) {
      setError(t('setup.errUsernameLen'))
      return
    }
    if (password.length < 8) {
      setError(t('setup.errPasswordLen'))
      return
    }
    if (password !== confirm) {
      setError(t('setup.errPasswordsMatch'))
      return
    }

    setLoading(true)
    try {
      await setup(username, password, email || undefined)
      navigate('/')
    } catch (err: any) {
      setError(err.message || t('setup.failed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{t('setup.title')}</CardTitle>
          <CardDescription>{t('setup.desc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-medium">{t('setup.username')}</label>
              <Input id="username" value={username} onChange={e => setUsername(e.target.value)} required minLength={3} />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">{t('setup.password')}</label>
              <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} />
            </div>
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">{t('setup.email')}</label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={t('setup.emailPlaceholder')} />
            </div>
            <div className="space-y-2">
              <label htmlFor="confirm" className="text-sm font-medium">{t('setup.confirmPassword')}</label>
              <Input id="confirm" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? t('creating') : t('setup.create')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
