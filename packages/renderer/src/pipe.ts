// Answers inside text: "Thanks, {name}!" or "{name|friend}" (a fallback for
// an empty answer) in field labels, descriptions, headings and paragraphs
// (formatted ones too). The answer is inserted as text, never as markup:
//   choices → their option labels; yes/no fields → Yes / No;
//   lists → joined with ", " ("، " in Arabic); ranges → "from – to";
//   calculated fields → with their decimals; files → their names;
//   matrices → nothing.
// {path} is a field's data path. Inside a repeater item, {lines.qty} is that
// item's own field; a reference that isn't a field (or an item field from
// outside its item) stays as typed, so mistakes are visible.

import { calculatedDecimals, CALCULATED_TYPE, formatCalculated } from './formula'
import { getCoreElement } from './elements'
import type { MessageCatalog } from './messages'
import { isRepeater } from './repeater'
import type { ElementNode } from './schema'

export type PipePart = { t: 'text'; v: string } | { t: 'ref'; path: string; fallback: string; raw: string }

const PIPE = /\{\s*([a-zA-Z]\w*(?:\.[a-zA-Z]\w*)*)\s*(?:\|([^{}]*))?\}/g

export function pipeParts(text: string): PipePart[] {
  const parts: PipePart[] = []
  let at = 0
  for (const m of text.matchAll(PIPE)) {
    if (m.index! > at) parts.push({ t: 'text', v: text.slice(at, m.index) })
    parts.push({ t: 'ref', path: m[1]!, fallback: (m[2] ?? '').trim(), raw: m[0] })
    at = m.index! + m[0].length
  }
  if (at < text.length) parts.push({ t: 'text', v: text.slice(at) })
  return parts
}

export const hasPipes = (text: string): boolean => new RegExp(PIPE.source).test(text)

export const listSeparator = (locale: string | undefined): string => (/^ar/i.test(locale ?? '') ? '، ' : ', ')

interface Option {
  value: unknown
  label?: unknown
}
function optionLabel(node: ElementNode, value: unknown): string {
  const items = Array.isArray(node.props['items']) ? (node.props['items'] as Option[]) : []
  const match = items.find((o) => String(o.value) === String(value))
  return match ? String(match.label ?? match.value) : String(value)
}

const CHOICES = new Set(['select', 'radiogroup', 'multiselect', 'checkboxgroup'])
const YES_NO = new Set(['checkbox', 'toggle'])

/** An answer as text (see the top of this file); '' when empty. */
export function answerText(node: ElementNode, value: unknown, messages: MessageCatalog, separator: string): string {
  if (node.type === CALCULATED_TYPE) return formatCalculated(value, calculatedDecimals(node))
  if (YES_NO.has(node.type)) return value === true ? messages.yes : value === false ? messages.no : ''
  if (node.type === 'matrix') return ''
  if (value === null || value === undefined || value === '') return ''
  if (CHOICES.has(node.type)) {
    const values = Array.isArray(value) ? value : [value]
    return values.map((v) => optionLabel(node, v)).join(separator)
  }
  if (Array.isArray(value)) {
    return value.map((v) => (v && typeof v === 'object' && 'name' in v ? String((v as { name: unknown }).name) : String(v))).join(separator)
  }
  if (typeof value === 'object') {
    const r = value as { from?: unknown; to?: unknown }
    const from = r.from === null || r.from === undefined ? '' : String(r.from)
    const to = r.to === null || r.to === undefined ? '' : String(r.to)
    return from !== '' && to !== '' ? `${from} – ${to}` : ''
  }
  return String(value)
}

/** Named value fields by template path ("lines.qty"), with their repeater's template path. */
export function fieldsByPath(nodes: ElementNode[], parent = '', repeater = '', out = new Map<string, { node: ElementNode; repeater: string }>()): Map<string, { node: ElementNode; repeater: string }> {
  for (const node of nodes) {
    const core = getCoreElement(node.type)
    if (!core) continue
    const path = node.name ? (parent ? `${parent}.${node.name}` : node.name) : parent
    if (isRepeater(node)) {
      if (node.name) fieldsByPath(node.children ?? [], path, path, out)
    } else if (core.isContainer) fieldsByPath(node.children ?? [], path, repeater, out)
    else if (core.hasValue && node.name) out.set(path, { node, repeater })
  }
  return out
}

/**
 * The text with answers inserted. `scopeTemplate` is the template path of
 * the item the text sits in ('' outside items); `read` reads a template path
 * (resolving that item's own fields).
 */
export function pipeText(
  text: string,
  fields: Map<string, { node: ElementNode; repeater: string }>,
  scopeTemplate: string,
  read: (path: string) => unknown,
  messages: MessageCatalog,
  separator: string,
): string {
  if (!text.includes('{')) return text
  return pipeParts(text)
    .map((part) => {
      if (part.t === 'text') return part.v
      const field = fields.get(part.path)
      if (!field || (field.repeater !== '' && field.repeater !== scopeTemplate)) return part.raw
      const answer = answerText(field.node, read(part.path), messages, separator)
      return answer === '' ? part.fallback : answer
    })
    .join('')
}


