// Simple formatting for paragraphs (props.format = 'markdown'): a small,
// safe subset of Markdown parsed into a tree, never into raw HTML.
//   **bold**   *italic* or _italic_   [text](https://…)
//   lines starting "- " or "* " → bullet list; "1. " → numbered list
//   a blank line starts a new paragraph; a single line break is kept.
// Links keep only safe URLs (isSafeUrl); anything else stays plain text.
// Each target renders the tree with its own escaping.

import { isSafeUrl } from './elements'
import type { ElementNode } from './schema'

export type MdInline =
  | { t: 'text'; v: string }
  | { t: 'br' }
  | { t: 'strong'; c: MdInline[] }
  | { t: 'em'; c: MdInline[] }
  | { t: 'link'; href: string; c: MdInline[] }

export type MdBlock = { t: 'p'; c: MdInline[] } | { t: 'ul' | 'ol'; items: MdInline[][] }

export const isMarkdownParagraph = (node: ElementNode): boolean =>
  node.type === 'paragraph' && node.props['format'] === 'markdown'

const BULLET = /^\s*[-*]\s+/
const NUMBERED = /^\s*\d+[.)]\s+/

export function parseMarkdown(source: string): MdBlock[] {
  const blocks: MdBlock[] = []
  let paragraph: string[] = []
  let list: { t: 'ul' | 'ol'; items: string[] } | null = null
  const flush = (): void => {
    if (paragraph.length) blocks.push({ t: 'p', c: inlineLines(paragraph) })
    if (list) blocks.push({ t: list.t, items: list.items.map((item) => parseInline(item)) })
    paragraph = []
    list = null
  }
  for (const line of source.replace(/\r\n?/g, '\n').split('\n')) {
    if (line.trim() === '') {
      flush()
      continue
    }
    const kind = BULLET.test(line) ? 'ul' : NUMBERED.test(line) ? 'ol' : null
    if (kind) {
      if (paragraph.length || (list && list.t !== kind)) flush()
      list ??= { t: kind, items: [] }
      list.items.push(line.replace(kind === 'ul' ? BULLET : NUMBERED, ''))
    } else if (list) {
      // A continuation line of the last list item.
      list.items[list.items.length - 1] += ` ${line.trim()}`
    } else paragraph.push(line.trim())
  }
  flush()
  return blocks
}

function inlineLines(lines: string[]): MdInline[] {
  return lines.flatMap((line, i) => (i === 0 ? parseInline(line) : [{ t: 'br' } as MdInline, ...parseInline(line)]))
}

/** Inline formatting: bold, italics and links, nested; unmatched markers stay text. */
export function parseInline(text: string): MdInline[] {
  const out: MdInline[] = []
  let plain = ''
  const push = (node: MdInline): void => {
    if (plain) out.push({ t: 'text', v: plain })
    plain = ''
    out.push(node)
  }
  let i = 0
  while (i < text.length) {
    const rest = text.slice(i)
    if (rest.startsWith('**')) {
      let end = text.indexOf('**', i + 2)
      // "**b *c***": the bold closes on the last two stars.
      while (end > 0 && text[end + 2] === '*') end++
      if (end > i + 2) {
        push({ t: 'strong', c: parseInline(text.slice(i + 2, end)) })
        i = end + 2
        continue
      }
    }
    const mark = text[i]
    if ((mark === '*' || mark === '_') && text[i + 1] !== mark && text[i + 1] !== ' ') {
      const end = text.indexOf(mark, i + 1)
      if (end > i + 1 && text[end - 1] !== ' ') {
        push({ t: 'em', c: parseInline(text.slice(i + 1, end)) })
        i = end + 1
        continue
      }
    }
    if (mark === '[') {
      const link = /^\[([^\]]+)\]\(([^()\s]+)\)/.exec(rest)
      if (link && isSafeUrl(link[2]!)) {
        push({ t: 'link', href: link[2]!, c: parseInline(link[1]!) })
        i += link[0].length
        continue
      }
    }
    plain += mark
    i++
  }
  if (plain) out.push({ t: 'text', v: plain })
  return out
}

/** Plain text of a formatted paragraph (e.g. for the builder canvas summary). */
export function markdownText(blocks: MdBlock[]): string {
  const inline = (nodes: MdInline[]): string =>
    nodes.map((n) => (n.t === 'text' ? n.v : n.t === 'br' ? ' ' : inline(n.c))).join('')
  return blocks.map((b) => (b.t === 'p' ? inline(b.c) : b.items.map(inline).join(' '))).join(' ')
}
