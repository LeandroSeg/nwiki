// SPDX-License-Identifier: GPL-3.0-or-later
import DOMPurify from 'dompurify'

interface Props {
  content: string
  isHtml?: boolean
}

const ALLOWED_TAGS = [
  'h1', 'h2', 'h3', 'h4', 'h5',
  'p', 'br', 'hr',
  'strong', 'em', 'u', 'code', 'sub', 'sup', 'del',
  'a', 'img',
  'ul', 'ol', 'li',
  'table', 'tr', 'td', 'th',
  'pre',
]

const ALLOWED_ATTR = ['href', 'target', 'rel', 'src', 'alt', 'width']

export default function SanitizedContent({ content, isHtml }: Props) {
  if (isHtml) {
    const sanitized = DOMPurify.sanitize(content, {
      ALLOWED_TAGS,
      ALLOWED_ATTR,
    })
    return (
      <div
        className="wiki-content"
        dangerouslySetInnerHTML={{ __html: sanitized }}
      />
    )
  }

  const sanitized = DOMPurify.sanitize(content, { ALLOWED_TAGS: [] })
  return (
    <pre className="whitespace-pre-wrap font-mono text-sm">{sanitized}</pre>
  )
}
