// SPDX-License-Identifier: GPL-3.0-or-later
import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useLang } from '../context/LanguageContext'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { useTitle } from '../lib/useTitle'

interface Result {
  id: string
  score: number
  snippet: string
}

export default function SearchResults() {
  const { t } = useLang()
  const [params] = useSearchParams()
  const query = params.get('q') || ''
  useTitle('Search: ' + query)
  const [results, setResults] = useState<Result[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!query) {
      setResults([])
      setLoading(false)
      return
    }
    setLoading(true)
    api.search(query)
      .then(data => setResults(data.results))
      .catch(() => setResults([]))
      .finally(() => setLoading(false))
  }, [query])

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">{t('search.title', { query })}</h1>
      {loading ? (
        <p className="text-muted-foreground">{t('searching')}</p>
      ) : results.length === 0 ? (
        <p className="text-muted-foreground">{t('search.noResults', { query })}</p>
      ) : (
        <div className="space-y-3">
          {results.map(r => (
            <Card key={r.id}>
              <CardHeader>
                <CardTitle className="text-lg">
                  <Link to={`/page/${encodeURIComponent(r.id)}`} className="text-blue-600 hover:underline">
                    {r.id}
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{r.snippet}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <Link to="/" className="text-blue-600 hover:underline mt-4 inline-block">{t('search.backHome')}</Link>
    </div>
  )
}
