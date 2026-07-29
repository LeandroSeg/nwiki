import { describe, it, expect } from 'vitest'
import { renderDokuWiki } from '../src/lib/dokuwiki.js'

const FOOTER = /\n<hr \/><footer style="text-align:center;font-size:80%;color:#999;padding:8px 0">nwiki — <a href="https:\/\/www\.gnu\.org\/licenses\/gpl-3\.0\.html" target="_blank" rel="noopener" style="color:#999">GNU GPL v3<\/a><\/footer>$/

function stripFooter(html: string): string {
  return html.replace(FOOTER, '')
}

describe('renderDokuWiki', () => {
  it('includes GPL footer', () => {
    const result = renderDokuWiki('hello')
    expect(result).toContain('nwiki')
    expect(result).toContain('GNU GPL v3')
    expect(result).toContain('gnu.org/licenses/gpl-3.0')
  })

  describe('headings', () => {
    it.each([
      ['====== h1 ======', '<h1>h1</h1>'],
      ['===== h2 =====', '<h2>h2</h2>'],
      ['==== h3 ====', '<h3>h3</h3>'],
      ['=== h4 ===', '<h4>h4</h4>'],
      ['== h5 ==', '<h5>h5</h5>'],
    ])('parses heading with closing =: %s', (input, expected) => {
      expect(stripFooter(renderDokuWiki(input).trim())).toBe(expected)
    })

    it.each([
      ['====== h1', '<h1>h1</h1>'],
      ['===== h2', '<h2>h2</h2>'],
      ['==== h3', '<h3>h3</h3>'],
      ['=== h4', '<h4>h4</h4>'],
      ['== h5', '<h5>h5</h5>'],
    ])('parses heading without closing =: %s', (input, expected) => {
      expect(stripFooter(renderDokuWiki(input).trim())).toBe(expected)
    })

    it.each([
      ['====== h1 ====== ', '<h1>h1</h1>'],
      ['===== h2 ===== ', '<h2>h2</h2>'],
      ['==== h3 ==== ', '<h3>h3</h3>'],
      ['=== h4 === ', '<h4>h4</h4>'],
      ['== h5 == ', '<h5>h5</h5>'],
    ])('parses heading with trailing space: %s', (input, expected) => {
      expect(stripFooter(renderDokuWiki(input).trim())).toBe(expected)
    })
  })
})
