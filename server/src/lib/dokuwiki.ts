// SPDX-License-Identifier: GPL-3.0-or-later
export function renderDokuWiki(text: string): string {
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  const html: string[] = []
  let inList: number[] = []
  let inTable = false
  let inPre = false

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i]

    if (inPre && !line.startsWith('  ') && line.trim() !== '') {
      html.push('</pre>')
      inPre = false
    }

    const headingHtml = parseHeading(line)
    if (headingHtml) {
      closeLists(html, inList); inList = []
      closeTable(html, inTable); inTable = false
      html.push(headingHtml)
      continue
    }

    if (/^-{4,}$/.test(line.trim())) {
      closeLists(html, inList); inList = []
      html.push('<hr />')
      continue
    }

    const listMatch = line.match(/^(\s{2,})([*\-])\s+(.*)$/)
    if (listMatch) {
      const indent = listMatch[1].length
      const item = listMatch[3]
      closeTable(html, inTable); inTable = false
      const depth = Math.floor(indent / 2)
      while (inList.length > 0 && inList[inList.length - 1] >= depth) {
        html.push('</li></ul>')
        inList.pop()
      }
      if (inList.length === 0 || inList[inList.length - 1] < depth) {
        html.push('<ul>')
        inList.push(depth)
      }
      html.push(`<li>${parseInline(item)}</li>`)
      continue
    }

    const listSimple = line.match(/^\s{0,2}[*\-]\s+(.*)$/)
    if (listSimple && !line.startsWith('  ')) {
      closeLists(html, inList); inList = []
      closeTable(html, inTable); inTable = false
      html.push('<ul>')
      inList.push(0)
      html.push(`<li>${parseInline(listSimple[1])}</li>`)
      continue
    }

    const tableMatch = line.match(/^\|(.+)\|$/)
    if (tableMatch) {
      closeLists(html, inList); inList = []
      if (!inTable) {
        html.push('<table>')
        inTable = true
      }
      const cells = splitTableCells(tableMatch[1]).map(c => c.trim())
      const tag = line.match(/^\^/) ? 'th' : 'td'
      html.push(`<tr>${cells.map(c => `<${tag}>${parseInline(c)}</${tag}>`).join('')}</tr>`)
      continue
    }

    if (line.startsWith('  ') && !/^\s{0,2}[*\-]\s/.test(line)) {
      closeLists(html, inList); inList = []
      closeTable(html, inTable); inTable = false
      if (!inPre) {
        html.push('<pre>')
        inPre = true
      }
      html.push(escapeHtml(line.trim()))
      continue
    }

    if (line.trim() === '' && inPre) {
      html.push('')
      continue
    }

    if (line.trim() === '' && inTable && (i + 1 >= lines.length || !lines[i + 1].startsWith('|'))) {
      closeTable(html, inTable); inTable = false
      continue
    }

    closeLists(html, inList); inList = []
    closeTable(html, inTable); inTable = false

    if (line.trim() === '') {
      continue
    }

    const lineBreak = line.endsWith('\\\\')
    const cleanLine = lineBreak ? line.slice(0, -2).trimEnd() : line
    html.push(`<p>${parseInline(cleanLine)}${lineBreak ? '<br />' : ''}</p>`)
  }

  closeLists(html, inList)
  closeTable(html, inTable)
  if (inPre) html.push('</pre>')

  html.push('<hr /><footer style="text-align:center;font-size:80%;color:#999;padding:8px 0">nwiki — <a href="https://www.gnu.org/licenses/gpl-3.0.html" target="_blank" rel="noopener" style="color:#999">GNU GPL v3</a></footer>')

  return html.join('\n')
}

function closeLists(html: string[], stack: number[]) {
  while (stack.length > 0) {
    html.push('</li></ul>')
    stack.pop()
  }
}

function closeTable(html: string[], inTable: boolean) {
  if (inTable) html.push('</table>')
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function parseInline(text: string): string {
  let result = text
  result = result.replace(/\[\[(.+?)\|(.+?)\]\]/g, (_match, page, label) => {
    if (/^https?:\/\//.test(page)) {
      return `<a href="${escapeHtml(page)}" target="_blank" rel="noopener">${parseInline(label)}</a>`
    }
    const href = page.replace(/:/g, '/').toLowerCase()
    return `<a href="/wiki/page/${encodeURIComponent(href)}">${parseInline(label)}</a>`
  })

  result = result.replace(/\[\[(.+?)\]\]/g, (_match, page) => {
    if (/^https?:\/\//.test(page)) {
      return `<a href="${escapeHtml(page)}" target="_blank" rel="noopener">${escapeHtml(page)}</a>`
    }
    const parts = page.split('|')
    const target = parts[0].replace(/:/g, '/').toLowerCase()
    const label = parts[1] || parts[0]
    return `<a href="/wiki/page/${encodeURIComponent(target)}">${parseInline(label)}</a>`
  })

  result = result.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  result = result.replace(/\/\/(.+?)\/\//g, '<em>$1</em>')
  result = result.replace(/__(.+?)__/g, '<u>$1</u>')
  result = result.replace(/''(.+?)''/g, '<code>$1</code>')

  result = result.replace(/\{\{[^}]*\}\}/g, (_match: string) => {
    const inner = _match.slice(2, -2)
    const parts = inner.split('|')
    const alt = parts[1] || ''
    const imgPart = parts[0]
    const imgMatch = imgPart.match(/^:?([^?]+?)(?:\?(\d+))?$/)
    if (!imgMatch) return ''
    const imgPath = imgMatch[1].replace(/:/g, '/')
    const imgSize = imgMatch[2] ? ` width="${imgMatch[2]}"` : ''
    const safeSrc = imgPath.split('/').map(encodeURIComponent).join('/')
    return `<img src="/wiki/api/media/${safeSrc}" alt="${escapeHtml(alt)}"${imgSize} />`
  })

  result = result.replace(/<sub>/g, '<sub>').replace(/<\/sub>/g, '</sub>')
  result = result.replace(/<sup>/g, '<sup>').replace(/<\/sup>/g, '</sup>')
  result = result.replace(/<del>/g, '<del>').replace(/<\/del>/g, '</del>')

  result = result.replace(/(?<![">])(https?:\/\/[^\s<]+)/g, (_match: string, url: string) => {
    return `<a href="${escapeHtml(url)}" target="_blank" rel="noopener">${escapeHtml(url)}</a>`
  })

  return result
}

function splitTableCells(row: string): string[] {
  const cells: string[] = []
  let current = ''
  let braceDepth = 0
  let bracketDepth = 0
  for (let i = 0; i < row.length; i++) {
    const ch = row[i]
    if (ch === '{' && row[i + 1] === '{') { braceDepth++; current += '{{'; i++; continue }
    if (ch === '}' && row[i + 1] === '}') { braceDepth--; current += '}}'; i++; continue }
    if (ch === '[' && row[i + 1] === '[') { bracketDepth++; current += '[['; i++; continue }
    if (ch === ']' && row[i + 1] === ']') { bracketDepth--; current += ']]'; i++; continue }
    if (ch === '|' && braceDepth === 0 && bracketDepth === 0) { cells.push(current); current = ''; continue }
    current += ch
  }
  cells.push(current)
  return cells
}

function parseHeading(line: string): string | null {
  const match = line.match(/^(={2,6})\s*(.*?)(?:\s*\1)?\s*$/)
  if (!match) return null
  const count = match[1].length
  const level = 7 - count
  const text = parseInline(match[2].trim())
  return `<h${level}>${text}</h${level}>`
}
