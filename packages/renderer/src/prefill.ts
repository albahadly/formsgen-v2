// Prefill from the page address. With meta.prefillFromQuery, a query
// parameter named like a field's data path fills that field
// (?email=a@b.c&topics=news&topics=offers, or topics=news,offers); a hidden
// field with `param` takes that parameter's value whatever the flag says.
// Values are converted to the field's kind; what can't be converted is left
// alone. Files, signatures, maps, matrices, ranges, rich text, passwords,
// calculated fields and repeater items are never filled from a URL.

import { BOOLEAN_TYPES, getCoreElement } from './elements'
import { joinPath } from './runtime'
import type { ElementNode } from './schema'

export type PrefillKind = 'string' | 'number' | 'bool' | 'list'

export interface PrefillEntry {
  path: string
  value: unknown
}

const LIST_TYPES: ReadonlySet<string> = new Set(['checkboxgroup', 'multiselect', 'tags', 'dates'])
const NUMBER_TYPES: ReadonlySet<string> = new Set(['number', 'range', 'rating', 'nps', 'currency'])
/** Never filled from a URL: no text form, or not something a link should set. */
const SKIPPED_TYPES: ReadonlySet<string> = new Set([
  'password',
  'file',
  'imageupload',
  'signature',
  'richtext',
  'location',
  'rangeslider',
  'daterange',
  'matrix',
  'calculated',
  'hidden',
])

/** How a field takes a query value, or null when it never does. */
export function prefillKind(node: ElementNode): PrefillKind | null {
  const core = getCoreElement(node.type)
  if (!core?.hasValue || core.isContainer || SKIPPED_TYPES.has(node.type)) return null
  if (BOOLEAN_TYPES.has(node.type)) return 'bool'
  if (NUMBER_TYPES.has(node.type)) return 'number'
  if (LIST_TYPES.has(node.type)) return 'list'
  return 'string'
}

const TRUE_WORDS: ReadonlySet<string> = new Set(['1', 'true', 'on', 'yes'])
const FALSE_WORDS: ReadonlySet<string> = new Set(['0', 'false', 'off', 'no'])

/** A parameter's values converted to the kind; undefined when they can't be. */
export function prefillValue(kind: PrefillKind, raw: readonly string[]): unknown {
  const first = raw[0]
  if (first === undefined) return undefined
  switch (kind) {
    case 'string':
      return first
    case 'number': {
      if (first.trim() === '') return undefined
      const n = Number(first)
      return Number.isFinite(n) ? n : undefined
    }
    case 'bool': {
      const word = first.trim().toLowerCase()
      return TRUE_WORDS.has(word) ? true : FALSE_WORDS.has(word) ? false : undefined
    }
    case 'list': {
      // One parameter may carry a comma-separated list; several carry one value each.
      const parts = raw.length === 1 ? first.split(',') : [...raw]
      return parts.map((p) => p.trim()).filter((p) => p !== '')
    }
  }
}

/**
 * The entries a query string fills, in tree order: fields by data path when
 * `fields` is on (meta.prefillFromQuery), hidden fields by their `param`
 * always. Repeater items are skipped (their paths are per item).
 */
export function queryPrefill(
  tree: ElementNode[],
  search: string,
  options: { fields: boolean },
): PrefillEntry[] {
  const query = new URLSearchParams(search)
  const entries: PrefillEntry[] = []
  const walk = (nodes: ElementNode[], parentPath: string): void => {
    for (const node of nodes) {
      const core = getCoreElement(node.type)
      if (!core || node.type === 'repeater') continue
      if (core.isContainer) {
        walk(node.children ?? [], node.name ? joinPath(parentPath, node.name) : parentPath)
        continue
      }
      if (!core.hasValue || !node.name) continue
      const path = joinPath(parentPath, node.name)
      if (node.type === 'hidden') {
        const param = node.props['param']
        if (typeof param === 'string' && param !== '' && query.has(param)) {
          entries.push({ path, value: query.get(param) ?? '' })
        }
        continue
      }
      if (!options.fields) continue
      const kind = prefillKind(node)
      if (!kind || !query.has(path)) continue
      const value = prefillValue(kind, query.getAll(path))
      if (value !== undefined) entries.push({ path, value })
    }
  }
  walk(tree, '')
  return entries
}
