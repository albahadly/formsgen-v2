// HTML blocks (element type "html", props.html): the author's HTML parsed
// into a tree of allowed tags and attributes, never injected as a string.
// Each target writes the tree out with its own escaping, so nothing outside
// the allowlist survives, however the input is written:
//   - script, style, object, svg, media and form controls are dropped with
//     everything inside them;
//   - an iframe stays only with an https:// src, always sandboxed
//     (IFRAME_SANDBOX: scripts and its own origin, so videos and maps
//     work, but no forms, popups or navigating the page), lazy, with a
//     strict referrer; its fallback content goes;
//   - other unknown tags (custom elements, font, center …) are unwrapped:
//     their content stays, the tag goes;
//   - event handlers (on*), id and unknown attributes are dropped;
//   - href/src keep only safe URLs (isSafeUrl), after decoding entities;
//   - inline styles keep plain declarations (no url(), expression(), @…);
//   - links opening a new tab get rel="noopener noreferrer".
// Pure TypeScript (no DOM), so the renderer, the builder and the exports
// share one parser.

import { isSafeUrl } from './elements'

export type HtmlNode = { t: 'text'; v: string } | { t: 'el'; tag: string; attrs: [string, string][]; c: HtmlNode[] }

/** Tags kept as they are. */
const ALLOWED_TAGS: ReadonlySet<string> = new Set([
  'p', 'br', 'hr', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'div', 'span', 'section', 'article', 'aside', 'header', 'footer',
  'strong', 'b', 'em', 'i', 'u', 's', 'small', 'mark', 'sub', 'sup', 'code', 'pre', 'kbd', 'abbr', 'cite', 'q', 'time',
  'blockquote', 'figure', 'figcaption', 'ul', 'ol', 'li', 'dl', 'dt', 'dd', 'a', 'img',
  'table', 'caption', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'details', 'summary',
])

/** Dropped together with their content. */
const DROPPED_WITH_CONTENT: ReadonlySet<string> = new Set([
  'script', 'style', 'frame', 'frameset', 'object', 'embed', 'applet', 'template', 'noscript', 'noembed',
  'noframes', 'textarea', 'title', 'xmp', 'select', 'option', 'button', 'head', 'math', 'svg', 'canvas', 'video', 'audio',
  'form', 'input', 'source', 'track', 'link', 'meta', 'base', 'param', 'picture', 'map', 'dialog', 'portal',
])

/** Dropped tags that never have content. */
const DROPPED_VOID: ReadonlySet<string> = new Set(['embed', 'frame', 'input', 'source', 'track', 'link', 'meta', 'base', 'param'])

/** Elements whose content is raw text up to their closing tag. */
const RAW_TEXT: ReadonlySet<string> = new Set(['script', 'style', 'textarea', 'title', 'xmp', 'iframe', 'noembed', 'noframes', 'noscript'])

export const VOID_TAGS: ReadonlySet<string> = new Set(['br', 'hr', 'img'])

const GLOBAL_ATTRS: ReadonlySet<string> = new Set(['class', 'title', 'style', 'dir', 'lang', 'aria-label', 'aria-hidden'])
const TAG_ATTRS: Record<string, ReadonlySet<string>> = {
  a: new Set(['href', 'target']),
  img: new Set(['src', 'alt', 'width', 'height']),
  td: new Set(['colspan', 'rowspan']),
  th: new Set(['colspan', 'rowspan', 'scope']),
  ol: new Set(['start', 'reversed']),
  time: new Set(['datetime']),
  details: new Set(['open']),
  iframe: new Set(['src', 'width', 'height', 'allow', 'allowfullscreen']),
}

/** Every kept iframe gets these (the author's own sandbox/referrer are dropped). */
export const IFRAME_SANDBOX = 'allow-scripts allow-same-origin allow-presentation'
/** Features an embed may ask for (`allow`); anything else is dropped. */
const IFRAME_FEATURES: ReadonlySet<string> = new Set([
  'autoplay', 'encrypted-media', 'fullscreen', 'picture-in-picture', 'clipboard-write', 'web-share', 'accelerometer', 'gyroscope',
])

/** Opening one of these closes an open element of the listed types first. */
const AUTO_CLOSE: Record<string, string[]> = {
  p: ['p'],
  li: ['li'],
  dt: ['dt', 'dd'],
  dd: ['dt', 'dd'],
  tr: ['tr', 'td', 'th'],
  td: ['td', 'th'],
  th: ['td', 'th'],
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', copy: '©', reg: '®', trade: '™', hellip: '…',
  mdash: '—', ndash: '–', laquo: '«', raquo: '»', times: '×', deg: '°', middot: '·', bull: '•', euro: '€', pound: '£',
}

export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, code: string) => {
    if (code[0] === '#') {
      const n = code[1] === 'x' || code[1] === 'X' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10)
      return n > 0 && n <= 0x10ffff && !(n >= 0xd800 && n <= 0xdfff) ? String.fromCodePoint(n) : '�'
    }
    return NAMED_ENTITIES[code.toLowerCase()] ?? whole
  })
}

/** Plain style declarations only: no url(), expression(), imports or escapes. */
export function safeStyle(style: string): string {
  return style
    .split(';')
    .map((d) => d.trim())
    .filter((d) => /^-?[a-z][a-z-]*\s*:\s*[^;]+$/i.test(d) && !/url\s*\(|expression|@|\\|[<>{}]|javascript:/i.test(d))
    .map((d) => d.replace(/\s*:\s*/, ': '))
    .join('; ')
}

function keepAttr(tag: string, name: string, value: string): string | null {
  if (!GLOBAL_ATTRS.has(name) && !TAG_ATTRS[tag]?.has(name)) return null
  if (tag === 'iframe' && name === 'src') return /^https:\/\/[^\s]/i.test(value.trim()) && isSafeUrl(value) ? value.trim() : null
  if (name === 'href' || name === 'src') return isSafeUrl(value) ? value.trim() : null
  if (name === 'allow') {
    const features = value.split(';').map((f) => f.trim().split(/\s+/)[0]!.toLowerCase()).filter((f) => IFRAME_FEATURES.has(f))
    return features.length ? [...new Set(features)].join('; ') : null
  }
  if (name === 'allowfullscreen') return ''
  if (name === 'style') return safeStyle(value) || null
  if (name === 'target') return value === '_blank' ? '_blank' : null
  if (['width', 'height', 'colspan', 'rowspan', 'start'].includes(name)) return /^\d{1,5}$/.test(value.trim()) ? value.trim() : null
  if (name === 'aria-hidden') return value === 'true' || value === 'false' ? value : null
  if (name === 'reversed' || name === 'open') return ''
  if (name === 'scope') return ['row', 'col', 'rowgroup', 'colgroup'].includes(value) ? value : null
  return value.length <= 500 ? value : null
}

const ATTR = /([^\s"'>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/y

/** Parses `html` into the allowed tree (see the top of this file). */
export function parseSafeHtml(html: string): HtmlNode[] {
  const root: HtmlNode[] = []
  const stack: { tag: string; c: HtmlNode[] }[] = [{ tag: '', c: root }]
  const top = (): { tag: string; c: HtmlNode[] } => stack[stack.length - 1]!
  const text = (v: string): void => {
    if (!v) return
    const siblings = top().c
    const last = siblings[siblings.length - 1]
    if (last?.t === 'text') last.v += v
    else siblings.push({ t: 'text', v })
  }
  const close = (tag: string): void => {
    const at = stack.map((s) => s.tag).lastIndexOf(tag)
    if (at > 0) stack.length = at
  }
  let i = 0
  while (i < html.length) {
    const lt = html.indexOf('<', i)
    if (lt === -1) {
      text(decodeEntities(html.slice(i)))
      break
    }
    text(decodeEntities(html.slice(i, lt)))
    i = lt
    if (html.startsWith('<!--', i)) {
      const end = html.indexOf('-->', i + 4)
      i = end === -1 ? html.length : end + 3
      continue
    }
    if (html[i + 1] === '!' || html[i + 1] === '?') {
      const end = html.indexOf('>', i)
      i = end === -1 ? html.length : end + 1
      continue
    }
    const closing = /^<\/([a-z][a-z0-9-]*)\s*>/i.exec(html.slice(i))
    if (closing) {
      const tag = closing[1]!.toLowerCase()
      if (ALLOWED_TAGS.has(tag)) close(tag)
      i += closing[0].length
      continue
    }
    const open = /^<([a-z][a-z0-9-]*)/i.exec(html.slice(i))
    if (!open) {
      // A lone "<": text.
      text('<')
      i++
      continue
    }
    const tag = open[1]!.toLowerCase()
    // Attributes up to the closing ">" (quoted values may hold ">").
    let j = i + open[0].length
    const attrs: [string, string][] = []
    let selfClosing = false
    for (;;) {
      while (j < html.length && /[\s/]/.test(html[j]!)) j++
      if (j >= html.length || html[j] === '>') {
        selfClosing = html[j - 1] === '/'
        break
      }
      ATTR.lastIndex = j
      const m = ATTR.exec(html)
      if (!m) {
        j++
        continue
      }
      j = ATTR.lastIndex
      const name = m[1]!.toLowerCase()
      const value = decodeEntities(m[2] ?? m[3] ?? m[4] ?? '')
      const kept = keepAttr(tag, name, value)
      if (kept !== null && !attrs.some(([n]) => n === name)) attrs.push([name, kept])
    }
    i = Math.min(j + 1, html.length)
    if (tag === 'iframe') {
      // Its content is fallback text for old browsers: skipped.
      const end = html.toLowerCase().indexOf('</iframe', i)
      if (!selfClosing) i = end === -1 ? html.length : (html.indexOf('>', end) + 1 || html.length)
      if (attrs.some(([n]) => n === 'src')) {
        attrs.push(['sandbox', IFRAME_SANDBOX], ['referrerpolicy', 'strict-origin-when-cross-origin'], ['loading', 'lazy'])
        top().c.push({ t: 'el', tag, attrs, c: [] })
      }
      continue
    }
    if (RAW_TEXT.has(tag)) {
      const end = html.toLowerCase().indexOf(`</${tag}`, i)
      i = end === -1 ? html.length : (html.indexOf('>', end) + 1 || html.length)
      continue
    }
    if (DROPPED_WITH_CONTENT.has(tag)) {
      if (selfClosing || DROPPED_VOID.has(tag)) continue
      // Skip to the matching close (same-name nesting counted). Without one,
      // only the tag goes and what follows is parsed as usual.
      let depth = 1
      const pattern = new RegExp(`<(/?)${tag}(?=[\\s/>])[^>]*>`, 'gi')
      pattern.lastIndex = i
      let m: RegExpExecArray | null
      while (depth > 0 && (m = pattern.exec(html))) depth += m[1] ? -1 : 1
      if (depth === 0) i = pattern.lastIndex
      continue
    }
    if (!ALLOWED_TAGS.has(tag)) continue // unwrapped: its content stays
    for (const closes of AUTO_CLOSE[tag] ?? []) if (top().tag === closes) stack.pop()
    if (tag === 'a') {
      if (attrs.some(([n]) => n === 'target')) attrs.push(['rel', 'noopener noreferrer'])
      if (stack.some((s) => s.tag === 'a')) close('a') // no nested links
    }
    const node: HtmlNode = { t: 'el', tag, attrs, c: [] }
    top().c.push(node)
    if (!VOID_TAGS.has(tag)) stack.push({ tag, c: node.c })
  }
  return root
}

/** The tree's text, e.g. for the builder's canvas summary. */
export function htmlText(nodes: HtmlNode[]): string {
  return nodes.map((n) => (n.t === 'text' ? n.v : htmlText(n.c))).join('')
}
