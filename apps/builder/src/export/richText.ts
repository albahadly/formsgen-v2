// Formatted paragraphs (props.format = 'markdown') in the code targets: the
// renderer's parsed tree (parseMarkdown) written as markup, escaped for
// each language. Text never becomes markup: HTML is escaped, Razor's @ is
// an entity, JSX braces are expressions, and Vue skips compiling the block
// (v-pre), so "{{ }}" stays text.

import { parseMarkdown, type ElementNode, type MdInline } from '@formsgen/renderer'
import { esc } from '@/registry/emitters/shared'
import type { EmitCtx, EmitterLang } from '@/registry/types'

function text(value: string, lang: EmitterLang): string {
  const escaped = esc(value)
  return lang === 'react' ? escaped.replace(/[{}]/g, (brace) => `{'${brace}'}`) : escaped
}

export function richTextMarkup(node: ElementNode, ctx: EmitCtx, lang: EmitterLang): string {
  const cls = (slot: Parameters<EmitCtx['css']['classes']>[0], extra = ''): string => {
    const value = [ctx.css.classes(slot), extra].filter(Boolean).join(' ')
    return value ? ` ${lang === 'react' ? 'className' : 'class'}="${value}"` : ''
  }
  const br = lang === 'html' || lang === 'vue' ? '<br>' : '<br />'
  const inline = (nodes: MdInline[]): string =>
    nodes
      .map((n) => {
        if (n.t === 'text') return text(n.v, lang)
        if (n.t === 'br') return br
        if (n.t === 'strong') return `<strong>${inline(n.c)}</strong>`
        if (n.t === 'em') return `<em>${inline(n.c)}</em>`
        return `<a${cls('link')} href="${esc(n.href)}">${inline(n.c)}</a>`
      })
      .join('')
  const blocks = parseMarkdown(String(node.props['text'] ?? '')).map((b) =>
    b.t === 'p'
      ? `  <p${cls('richBlock')}>${inline(b.c)}</p>`
      : `  <${b.t}${cls(b.t === 'ul' ? 'richList' : 'richListOrdered')}>\n${b.items.map((item) => `    <li>${inline(item)}</li>`).join('\n')}\n  </${b.t}>`,
  )
  const container = [ctx.css.classes('paragraph'), ctx.css.classes('richText')].filter(Boolean).join(' ')
  return `<div ${lang === 'react' ? 'className' : 'class'}="${container}"${lang === 'vue' ? ' v-pre' : ''}>\n${blocks.join('\n')}\n</div>`
}
