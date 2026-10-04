// Blazor CSS isolation only stamps the component's own plain elements with
// its scope attribute; elements rendered by child components (InputText's
// <input>, EditForm's <form>) never get it. Rules in a .razor.css therefore
// go through ::deep: anchored on the form root (the scoped wrapper div) when
// they start there, otherwise on any scoped ancestor.

const ROOT_COMPOUND = /^\.(?:fg-form|fg-themed)(?![\w-])\S*/

function splitSelectors(prelude: string): string[] {
  const parts: string[] = []
  let depth = 0
  let start = 0
  for (let i = 0; i < prelude.length; i++) {
    const c = prelude[i]
    if (c === '\\') i++
    else if (c === '(') depth++
    else if (c === ')') depth--
    else if (c === ',' && depth === 0) {
      parts.push(prelude.slice(start, i))
      start = i + 1
    }
  }
  parts.push(prelude.slice(start))
  return parts
}

function deepSelector(selector: string): string {
  const lead = /^\s*/.exec(selector)![0]
  const body = selector.slice(lead.length).trimEnd()
  const trail = selector.slice(lead.length + body.length)
  const root = ROOT_COMPOUND.exec(body)?.[0]
  if (root === undefined) return `${lead}::deep ${body}${trail}`
  const rest = body.slice(root.length).trimStart()
  return rest ? `${lead}${root} ::deep ${rest}${trail}` : selector
}

/** Rewrites a generated stylesheet for a Blazor .razor.css file. */
export function scopeForBlazor(css: string): string {
  let out = ''
  let i = 0
  while (i < css.length) {
    const c = css[i]!
    if (/\s/.test(c) || c === '}') {
      out += c
      i++
      continue
    }
    if (css.startsWith('/*', i)) {
      const end = css.indexOf('*/', i + 2) + 2
      out += css.slice(i, end)
      i = end
      continue
    }
    const open = css.indexOf('{', i)
    if (open < 0) {
      out += css.slice(i)
      break
    }
    const prelude = css.slice(i, open)
    if (prelude.startsWith('@')) {
      // At-rule block (e.g. @media): its nested rules are scoped as we go.
      out += `${prelude}{`
      i = open + 1
      continue
    }
    const close = css.indexOf('}', open)
    out += `${splitSelectors(prelude).map(deepSelector).join(',')}${css.slice(open, close + 1)}`
    i = close + 1
  }
  return out
}
