// Repeatable sections ("repeater"): a named container whose value is an
// array of item objects built from its children. Inside an item, data
// paths carry the index (`people.0.name`), while conditions and same-as
// rules name sibling fields by the template path (`people.name`) — they
// resolve to the SAME item. Children: any value field or static element
// (containers are not allowed inside items).

import { getCoreElement } from './elements'
import type { ElementNode } from './schema'

export const REPEATER_TYPE = 'repeater'

/** Element types a repeater may not contain (besides containers). */
export const REPEATER_EXCLUDED_TYPES: ReadonlySet<string> = new Set<string>()

export function isRepeater(node: ElementNode | undefined | null): boolean {
  return node?.type === REPEATER_TYPE
}

/** May a node of `type` live inside a repeater? */
export function allowedInRepeater(type: string): boolean {
  const core = getCoreElement(type)
  return Boolean(core) && !core!.isContainer && !REPEATER_EXCLUDED_TYPES.has(type)
}

function intProp(node: ElementNode, key: string): number | undefined {
  const value = Number(node.props[key])
  return Number.isInteger(value) && value >= 0 ? value : undefined
}

/** Item-count limits: min defaults to 1, max to none; initial ≥ min. */
export function repeaterLimits(node: ElementNode): { min: number; max: number; initial: number } {
  const min = intProp(node, 'minItems') ?? 1
  const maxRaw = intProp(node, 'maxItems')
  const max = maxRaw !== undefined && maxRaw > 0 ? Math.max(maxRaw, min) : Infinity
  const initial = Math.min(Math.max(intProp(node, 'initialItems') ?? 1, min), max)
  return { min, max, initial }
}

/** A fresh item object: every named value child at its default. */
export function repeaterItemDefaults(node: ElementNode): Record<string, unknown> {
  const item: Record<string, unknown> = {}
  for (const child of node.children ?? []) {
    const core = getCoreElement(child.type)
    if (!core || !core.hasValue || core.isContainer || !child.name) continue
    item[child.name] = child.props['default'] !== undefined ? child.props['default'] : core.defaultValue(child)
  }
  return item
}

/** props.sortable: visitors may reorder items (move up / move down). */
export function repeaterSortable(node: ElementNode): boolean {
  return node.props['sortable'] === true
}

/** Label of item `index` (0-based): props.itemLabel with {n}, else fallback. */
export function repeaterItemLabel(node: ElementNode, index: number, fallback: string): string {
  const template = typeof node.props['itemLabel'] === 'string' && node.props['itemLabel'] !== ''
    ? (node.props['itemLabel'] as string)
    : fallback
  return template.split('{n}').join(String(index + 1))
}

/** Template → actual path mapping for one repeater item. */
export interface ItemScope {
  /** Repeater path without index, e.g. "people". */
  template: string
  /** That item's path, e.g. "people.2". */
  actual: string
  index: number
  /** Stable per item (survives moves); radio group names use it. */
  key?: number | undefined
}

/** Maps a template path (`people.name`) to the item's path (`people.2.name`). */
export function resolveScoped(field: string, scope: ItemScope | null | undefined): string {
  if (scope && field.startsWith(`${scope.template}.`)) {
    return `${scope.actual}${field.slice(scope.template.length)}`
  }
  return field
}
