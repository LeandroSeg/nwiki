// SPDX-License-Identifier: GPL-3.0-or-later
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useLang } from '../context/LanguageContext'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { useTitle } from '../lib/useTitle'

export default function PageList() {
  const { t } = useLang()
  useTitle('')
  const [pages, setPages] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.listPages()
      .then(data => setPages(data.pages))
      .catch(() => setPages([]))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-4 text-muted-foreground">{t('loadingPages')}</div>

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('pageList.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        {pages.length === 0 ? (
          <p className="text-muted-foreground">{t('pageList.empty')}</p>
        ) : (
          <ul className="space-y-1">
            {pages.map(id => (
              <li key={id}>
                <Link to={`/page/${encodeURIComponent(id)}`} className="text-blue-600 hover:underline">
                  {id}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
