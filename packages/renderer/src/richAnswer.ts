// Rich-text answers (element type "richtext"): the editor's HTML reduced to
// a small, canonical set: p, br, strong, em, u, s, ul, ol, li and links
// (http, https, mailto; href only). b/i become strong/em, div becomes p;
// a p (or div) holding lists or other blocks, or inside a paragraph, is
// unwrapped so the result stays valid; anything else is unwrapped
// (scripts, styles and the like go with their content, see safeHtml.ts),
// attributes go. Empty answers (no text, no list item) are ''. The code
// exports clean with the same rules in script (export/richAnswer.ts), so the
// submitted value is the same everywhere; servers should clean it again.

import { parseSafeHtml, type HtmlNode } from './safeHtml'

export const RICH_TAGS: ReadonlySet<string> = new Set(['p', 'br', 'strong', 'em', 'u', 's', 'ul', 'ol', 'li', 'a'])
const RENAME: Record<string, string> = { b: 'strong', i: 'em', div: 'p' }
const BLOCKS: ReadonlySet<string> = new Set(['p', 'div', 'ul', 'ol', 'li'])

/** Does the node hold a block (a paragraph there would be invalid)? */
const holdsBlock = (nodes: HtmlNode[]): boolean => nodes.some((n) => n.t === 'el' && (BLOCKS.has(n.tag) || holdsBlock(n.c)))

const escText = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const escAttr = (s: string): string => escText(s).replace(/"/g, '&quot;')

export const isRichHref = (href: string): boolean => /^(https?:\/\/|mailto:)[^\s"<>]+$/i.test(href.trim())

function write(nodes: HtmlNode[], inParagraph: boolean): string {
  return nodes
    .map((node) => {
      if (node.t === 'text') return escText(node.v.replace(/\u00a0/g, ' '))
      const tag = RENAME[node.tag] ?? node.tag
      if (!RICH_TAGS.has(tag) || (tag === 'p' && (inParagraph || holdsBlock(node.c)))) return write(node.c, inParagraph)
      if (tag === 'br') return '<br>'
      if (tag === 'a') {
        const href = node.attrs.find(([name]) => name === 'href')?.[1] ?? ''
        return isRichHref(href) ? `<a href="${escAttr(href.trim())}">${write(node.c, inParagraph)}</a>` : write(node.c, inParagraph)
      }
      return `<${tag}>${write(node.c, inParagraph || tag === 'p')}</${tag}>`
    })
    .join('')
}

/** The answer as stored: canonical HTML, or '' when there is nothing in it. */
export function cleanRichText(html: unknown): string {
  if (typeof html !== 'string' || html.trim() === '') return ''
  const out = write(parseSafeHtml(html), false)
  return richPlainText(out) === '' && !out.includes('<li>') ? '' : out
}

/** The answer's text (answers inside text, previews): tags as spaces, entities decoded. */
export function richPlainText(html: unknown): string {
  if (typeof html !== 'string') return ''
  return html
    .replace(/<br>|<\/?(p|li|ul|ol)>/g, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
}
