// SPDX-License-Identifier: GPL-3.0-or-later
import MiniSearch from 'minisearch'
import { listPages, readPage } from './fileHandler.js'

let miniSearch: MiniSearch | null = null

export async function rebuildIndex(pagesDir: string): Promise<void> {
  const ms = new MiniSearch({
    fields: ['id', 'content'],
    storeFields: ['id'],
    searchOptions: {
      boost: { id: 2 },
      prefix: true,
      fuzzy: 0.2,
    },
  })

  const pages = await listPages(pagesDir)
  const docs = await Promise.all(
    pages.map(async (id) => {
      try {
        const content = await readPage(pagesDir, id)
        return { id, content }
      } catch {
        return null
      }
    })
  )

  const valid = docs.filter((d): d is { id: string; content: string } => d !== null)
  await ms.addAllAsync(valid)
  miniSearch = ms
}

export async function addToIndex(id: string, content: string): Promise<void> {
  if (!miniSearch) return
  await miniSearch.add({ id, content })
}

export async function updateIndex(id: string, content: string): Promise<void> {
  if (!miniSearch) return
  try { await miniSearch.discard(id) } catch { /* not in index */ }
  await miniSearch.add({ id, content })
}

export async function removeFromIndex(id: string): Promise<void> {
  if (!miniSearch) return
  try { await miniSearch.discard(id) } catch { /* not in index */ }
}

export interface SearchResult {
  id: string
  score: number
  snippet: string
}

export function search(query: string): SearchResult[] {
  if (!miniSearch) return []

  const rawResults = miniSearch.search(query, { prefix: true, fuzzy: 0.2 })
  return rawResults.map(r => ({
    id: r.id as string,
    score: r.score,
    snippet: '',
  }))
}

export function highlightSnippet(content: string, query: string): string {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  const lines = content.split('\n')
  for (const line of lines) {
    const lower = line.toLowerCase()
    if (words.some(w => lower.includes(w))) {
      const start = Math.max(0, lower.indexOf(words[0]) - 40)
      const end = Math.min(line.length, start + 160)
      return (start > 0 ? '...' : '') + line.slice(start, end) + (end < line.length ? '...' : '')
    }
  }
  return content.slice(0, 160) + (content.length > 160 ? '...' : '')
}
