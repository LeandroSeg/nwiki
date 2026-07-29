// SPDX-License-Identifier: GPL-3.0-or-later
import { Button } from './ui/button'
import { useLang } from '../context/LanguageContext'
import { ArrowRightToLine, ArrowUpToLine } from 'lucide-react'

type FormatFn = (
  value: string, start: number, end: number
) => { value: string; selStart: number; selEnd: number }

interface Props {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
  onMediaClick: () => void
  onHelpClick: () => void
  onPreviewClick: () => void
  orientation: 'horizontal' | 'vertical'
  onToggleOrientation: () => void
  onFormat: (fn: FormatFn) => void
}

export default function FormatToolbar({ textareaRef, onMediaClick, onHelpClick, onPreviewClick, orientation, onToggleOrientation, onFormat }: Props) {
  const { lang } = useLang()

  const btnClass = orientation === 'vertical'
    ? 'h-10 w-full px-0 text-sm font-mono justify-center'
    : 'h-9 min-w-9 px-1.5 text-sm font-mono'

  function wrap(pre: string, suf: string, placeholder: string) {
    onFormat((value, start, end) => {
      const selected = value.substring(start, end) || placeholder
      return {
        value: value.substring(0, start) + pre + selected + suf + value.substring(end),
        selStart: start + pre.length,
        selEnd: start + pre.length + (selected === placeholder ? placeholder.length : selected.length),
      }
    })
  }

  function insert(text: string, cursorOffset?: number) {
    onFormat((value, start, end) => {
      const pos = cursorOffset !== undefined ? start + cursorOffset : start + text.length
      return {
        value: value.substring(0, start) + text + value.substring(end),
        selStart: pos,
        selEnd: pos,
      }
    })
  }

  function applyToList(prefix: string) {
    const ta = textareaRef.current
    if (!ta) return
    if (ta.selectionStart !== ta.selectionEnd) {
      onFormat((value, start, end) => {
        const selected = value.substring(start, end)
        const lines = selected.split('\n').map(l => prefix + l).join('\n')
        return {
          value: value.substring(0, start) + lines + value.substring(end),
          selStart: start + lines.length,
          selEnd: start + lines.length,
        }
      })
    } else {
      onFormat((value, start, end) => {
        return {
          value: value.substring(0, start) + prefix + value.substring(end),
          selStart: start + prefix.length,
          selEnd: start + prefix.length,
        }
      })
    }
  }

  type Btn = { type: 'btn'; icon: string; label: string; action: () => void } | { type: 'sep' }
  const btns: Btn[] = [
    { type: 'btn', icon: 'B', label: lang === 'pt' ? 'Negrito' : 'Bold', action: () => wrap('**', '**', 'texto') },
    { type: 'btn', icon: 'I', label: lang === 'pt' ? 'Itálico' : 'Italic', action: () => wrap('//', '//', 'texto') },
    { type: 'btn', icon: 'U', label: lang === 'pt' ? 'Sublinhado' : 'Underline', action: () => wrap('__', '__', 'texto') },
    { type: 'btn', icon: 'S', label: lang === 'pt' ? 'Tachado' : 'Strikethrough', action: () => wrap('<del>', '</del>', 'texto') },
    { type: 'btn', icon: 'C', label: lang === 'pt' ? 'Código' : 'Code', action: () => wrap("''", "''", 'código') },
    { type: 'sep' },
    { type: 'btn', icon: 'H1', label: 'Título 1', action: () => wrap('====== ', ' ======', 'Título 1') },
    { type: 'btn', icon: 'H2', label: 'Título 2', action: () => wrap('===== ', ' =====', 'Título 2') },
    { type: 'btn', icon: 'H3', label: 'Título 3', action: () => wrap('==== ', ' ====', 'Título 3') },
    { type: 'sep' },
    { type: 'btn', icon: '🔗', label: lang === 'pt' ? 'Link interno' : 'Internal link', action: () => wrap('[[', ']]', 'página') },
    { type: 'btn', icon: '🌐', label: lang === 'pt' ? 'Link externo' : 'External link', action: () => wrap('[[', '|texto]]', 'https://...') },
    { type: 'btn', icon: '🖼', label: lang === 'pt' ? 'Imagem' : 'Image', action: () => wrap('{{:', '|legenda}}', 'caminho:arquivo.png') },
    { type: 'btn', icon: '📎', label: lang === 'pt' ? 'Mídia' : 'Media', action: () => onMediaClick() },
    { type: 'sep' },
    { type: 'btn', icon: '•', label: lang === 'pt' ? 'Lista' : 'List', action: () => applyToList('* ') },
    { type: 'btn', icon: '#', label: lang === 'pt' ? 'Lista numerada' : 'Numbered list', action: () => applyToList('- ') },
    { type: 'btn', icon: '⊞', label: lang === 'pt' ? 'Tabela' : 'Table', action: () => insert('| Cabeçalho 1 | Cabeçalho 2 |\n| Célula 1 | Célula 2 |\n| Célula 3 | Célula 4 |\n') },
    { type: 'sep' },
    { type: 'btn', icon: '—', label: lang === 'pt' ? 'Linha horizontal' : 'Horizontal rule', action: () => insert('\n----\n') },
    { type: 'btn', icon: '↵', label: lang === 'pt' ? 'Quebra de linha' : 'Line break', action: () => insert('\\\\') },
    { type: 'btn', icon: 'x₂', label: lang === 'pt' ? 'Subscrito' : 'Subscript', action: () => wrap('<sub>', '</sub>', 'texto') },
    { type: 'btn', icon: 'x²', label: lang === 'pt' ? 'Sobrescrito' : 'Superscript', action: () => wrap('<sup>', '</sup>', 'texto') },
  ]

  if (orientation === 'vertical') {
    return (
      <div className="hidden sm:flex flex-col items-center gap-0.5 p-1.5 border rounded-md bg-muted/30 w-fit shrink-0">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          title={lang === 'pt' ? 'Barra horizontal' : 'Horizontal toolbar'}
          className="h-9 w-full px-0 text-sm justify-center"
          onClick={onToggleOrientation}
        >
          <ArrowUpToLine className="h-4 w-4" />
        </Button>
        <div className="w-8 h-px bg-border" />
        <div className="grid grid-cols-2 gap-0.5">
          {btns.map((b, i) => {
            if (b.type === 'sep') {
              return <div key={i} className="col-span-2 h-px bg-border my-0.5" />
            }
            return (
              <Button
                key={i}
                type="button"
                variant="ghost"
                size="sm"
                title={b.label}
                className={btnClass}
                onClick={b.action}
              >
                {b.icon}
              </Button>
            )
          })}
        </div>
        <div className="w-8 h-px bg-border" />
        <Button
          type="button"
          variant="outline"
          size="sm"
          title={lang === 'pt' ? 'Pré-visualizar' : 'Preview'}
          className="h-9 w-full px-0 text-sm justify-center"
          onClick={onPreviewClick}
        >
          👁
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          title={lang === 'pt' ? 'Ajuda de formatação' : 'Formatting help'}
          className="h-9 w-full px-0 text-sm justify-center"
          onClick={onHelpClick}
        >
          ?
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-0.5 p-1.5 border rounded-md bg-muted/30">
      {btns.map((b, i) => {
        if (b.type === 'sep') {
          return <div key={i} className="w-px h-6 bg-border mx-1" />
        }
        return (
          <Button
            key={i}
            type="button"
            variant="ghost"
            size="sm"
            title={b.label}
            className={btnClass}
            onClick={b.action}
          >
            {b.icon}
          </Button>
        )
      })}
      <div className="flex-1" />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        title={lang === 'pt' ? 'Alternar barra vertical' : 'Toggle vertical toolbar'}
        className="h-9 min-w-9 px-1.5 text-sm"
        onClick={onToggleOrientation}
      >
        <ArrowRightToLine className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        title={lang === 'pt' ? 'Pré-visualizar' : 'Preview'}
        className="h-9 px-2 text-sm gap-1"
        onClick={onPreviewClick}
      >
        👁 {lang === 'pt' ? 'Prévia' : 'Preview'}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        title={lang === 'pt' ? 'Ajuda de formatação' : 'Formatting help'}
        className="h-9 min-w-9 px-1.5 text-sm"
        onClick={onHelpClick}
      >
        ?
      </Button>
    </div>
  )
}
