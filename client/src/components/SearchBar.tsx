// SPDX-License-Identifier: GPL-3.0-or-later
import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLang } from '../context/LanguageContext'
import { Input } from './ui/input'

export default function SearchBar() {
  const { t } = useLang()
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    const q = query.trim()
    if (q) navigate(`/search?q=${encodeURIComponent(q)}`)
  }, [query, navigate])

  return (
    <form onSubmit={handleSubmit} className="relative">
      <Input
        type="search"
        placeholder={t('nav.search')}
        value={query}
        onChange={e => setQuery(e.target.value)}
        className="w-48 md:w-64"
      />
    </form>
  )
}
