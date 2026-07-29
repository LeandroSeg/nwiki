// SPDX-License-Identifier: GPL-3.0-or-later
import { useLang } from '../context/LanguageContext'
import { Button } from '../components/ui/button'

interface Props {
  open: boolean
  onClose: () => void
}

const syntaxHelp = {
  pt: [
    { label: 'Títulos', example: '====== Título 1 ======\n===== Título 2 =====\n==== Título 3 ====\n=== Título 4 ===\n== Título 5 ==' },
    { label: 'Negrito', example: '**texto em negrito**' },
    { label: 'Itálico', example: '//texto em itálico//' },
    { label: 'Sublinhado', example: '__texto sublinhado__' },
    { label: 'Código', example: "''código''" },
    { label: 'Link interno', example: '[[paginanome]]\n[[paginanome|Texto exibido]]' },
    { label: 'Link externo', example: '[[https://url.com|Texto]]' },
    { label: 'Imagem', example: '{{:caminho:arquivo.png?tamanho|legenda}}' },
    { label: 'Lista', example: '* Item 1\n  * Subitem\n* Item 2' },
    { label: 'Tabela', example: '| Célula 1 | Célula 2 |\n| Célula 3 | Célula 4 |' },
    { label: 'Linha horizontal', example: '----' },
    { label: 'Quebra de linha', example: 'Linha 1\\\\Linha 2' },
    { label: 'Sobrescrito / Subscrito', example: '<sup>superior</sup> / <sub>inferior</sub>' },
    { label: 'Riscado', example: '<del>texto riscado</del>' },
  ],
  en: [
    { label: 'Headings', example: '====== Heading 1 ======\n===== Heading 2 =====\n==== Heading 3 ====\n=== Heading 4 ===\n== Heading 5 ==' },
    { label: 'Bold', example: '**bold text**' },
    { label: 'Italic', example: '//italic text//' },
    { label: 'Underline', example: '__underline text__' },
    { label: 'Code', example: "''code''" },
    { label: 'Internal link', example: '[[pagename]]\n[[pagename|Display text]]' },
    { label: 'External link', example: '[[https://url.com|Text]]' },
    { label: 'Image', example: '{{:path:file.png?size|caption}}' },
    { label: 'List', example: '* Item 1\n  * Subitem\n* Item 2' },
    { label: 'Table', example: '| Cell 1 | Cell 2 |\n| Cell 3 | Cell 4 |' },
    { label: 'Horizontal rule', example: '----' },
    { label: 'Line break', example: 'Line 1\\\\Line 2' },
    { label: 'Superscript / Subscript', example: '<sup>super</sup> / <sub>sub</sub>' },
    { label: 'Strikethrough', example: '<del>strikethrough</del>' },
  ],
}

export default function FormatHelp({ open, onClose }: Props) {
  const { t, lang } = useLang()
  if (!open) return null

  const help = lang === 'en' ? syntaxHelp.en : syntaxHelp.pt

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-[var(--card)] border rounded-lg shadow-xl max-w-lg w-full max-h-[80vh] overflow-y-auto m-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-[var(--card)]">
          <h2 className="text-lg font-bold">{t('pageEdit.helpTitle')}</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>{t('pageEdit.helpClose')}</Button>
        </div>
        <div className="p-4 space-y-4">
          {help.map(item => (
            <div key={item.label}>
              <h3 className="text-sm font-semibold mb-1">{item.label}</h3>
              <pre className="text-xs bg-muted p-2 rounded whitespace-pre-wrap font-mono">{item.example}</pre>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
