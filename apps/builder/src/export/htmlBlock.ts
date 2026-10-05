// HTML blocks in the code targets: the author's HTML reduced to allowed
// tags and attributes by the renderer's parser (parseSafeHtml), then written
// out with each language's escaping. Text and attribute values are escaped
// (Razor's @ included). Vue: "{" in text is an entity, so "{{ }}" stays
// text, and an image's src is bound (:src) so the SFC compiler doesn't turn
// it into a build-time import. JSX gets its attribute names, numbers, a
// style object and braces or line breaks in text as string expressions.

import { VOID_TAGS, parseSafeHtml, type ElementNode, type HtmlNode } from '@formsgen/renderer'
import { esc } from '@/registry/emitters/shared'
import type { EmitCtx, EmitterLang } from '@/registry/types'

const JSX_NAMES: Record<string, string> = {
  class: 'className',
  colspan: 'colSpan',
  rowspan: 'rowSpan',
  datetime: 'dateTime',
  allowfullscreen: 'allowFullScreen',
  referrerpolicy: 'referrerPolicy',
}
/** Attributes without a value (present = on). */
const BOOLEAN_ATTRS: ReadonlySet<string> = new Set(['open', 'reversed', 'allowfullscreen'])
const JSX_NUMBERS: ReadonlySet<string> = new Set(['colspan', 'rowspan', 'start'])

function jsxStyle(style: string): string {
  const entries = style
    .split(';')
    .map((d) => d.trim())
    .filter(Boolean)
    .map((d) => {
      const at = d.indexOf(':')
      const key = d
        .slice(0, at)
        .trim()
        .replace(/^-(webkit|moz|ms)-/, (_, vendor: string) => `${vendor === 'ms' ? 'ms' : vendor[0]!.toUpperCase() + vendor.slice(1)}-`)
        .replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())
      return `${key}: ${JSON.stringify(d.slice(at + 1).trim())}`
    })
  return `{{ ${entries.join(', ')} }}`
}

function attrs(list: [string, string][], lang: EmitterLang): string {
  return list
    .map(([name, value]) => {
      if (lang === 'react') {
        if (name === 'style') return ` style=${jsxStyle(value)}`
        if (value === '' && BOOLEAN_ATTRS.has(name)) return ` ${JSX_NAMES[name] ?? name}`
        // React types these as numbers (the parser kept digits only).
        if (JSX_NUMBERS.has(name)) return ` ${JSX_NAMES[name] ?? name}={${Number(value)}}`
        return ` ${JSX_NAMES[name] ?? name}="${esc(value)}"`
      }
      if (value === '' && BOOLEAN_ATTRS.has(name)) return ` ${name}`
      if (lang === 'vue' && name === 'src') return ` :src="${esc(jsSingle(value))}"`
      return ` ${name}="${esc(value)}"`
    })
    .join('')
}

/** A single-quoted JS string literal. */
const jsSingle = (s: string): string => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`

function text(value: string, lang: EmitterLang): string {
  if (lang === 'react' && /[{}\n]/.test(value)) return `{${JSON.stringify(value)}}`
  return lang === 'vue' ? esc(value).replace(/\{/g, '&#123;') : esc(value)
}

export function writeHtmlNodes(nodes: HtmlNode[], lang: EmitterLang): string {
  return nodes
    .map((n) => {
      if (n.t === 'text') return text(n.v, lang)
      const open = `<${n.tag}${attrs(n.attrs, lang)}`
      if (VOID_TAGS.has(n.tag)) return lang === 'html' || lang === 'vue' ? `${open}>` : `${open} />`
      return `${open}>${writeHtmlNodes(n.c, lang)}</${n.tag}>`
    })
    .join('')
}

export function htmlBlockMarkup(node: ElementNode, ctx: EmitCtx, lang: EmitterLang): string {
  const body = writeHtmlNodes(parseSafeHtml(String(node.props['html'] ?? '')), lang)
  const cls = ctx.css.classes('htmlBlock')
  const classAttr = cls ? ` ${lang === 'react' ? 'className' : 'class'}="${cls}"` : ''
  return `<div${classAttr}>${body}</div>`
}
