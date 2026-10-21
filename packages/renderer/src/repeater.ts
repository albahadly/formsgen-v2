// Repeatable sections ("repeater"): a named container whose value is an
// array of item objects built from its children. Inside an item, data
// paths carry the index (`people.0.name`), while conditions and same-as
// rules name sibling fields by the template path (`people.name`) — they
// resolve to the SAME item. Children: any field or static element, layout
// containers (unnamed groups, columns) and one more level of repeaters
// (e.g. travellers → bags); tabs/steps can't go inside items.

import { getCoreElement } from './elements'
import type { ElementNode } from './schema'

export const REPEATER_TYPE = 'repeater'

/** Element types a repeater item may not contain, at any depth. */
// Sections cannot repeat; currency and address keep per-field state the
// runtimes key by a fixed path (phase 45b), so they stay outside items too.
export const REPEATER_EXCLUDED_TYPES: ReadonlySet<string> = new Set(['tabs', 'tab', 'steps', 'step', 'currency', 'address'])

/** Repeaters nest at most this deep (a repeater inside a repeater's item). */
export const MAX_REPEATER_DEPTH = 2

export function isRepeater(node: ElementNode | undefined | null): boolean {
  return node?.type === REPEATER_TYPE
}

/** May a node of `type` live inside a repeater item (type alone)? */
export function allowedInRepeater(type: string): boolean {
  return Boolean(getCoreElement(type)) && !REPEATER_EXCLUDED_TYPES.has(type)
}

/**
 * Why a node can't sit inside `repeaterDepth` repeaters, or null when it
 * can. `field` says which property is at fault.
 */
export function itemPlacementProblem(
  node: { type: string; name?: string | undefined },
  repeaterDepth: number,
): { field: 'type' | 'name'; message: string } | null {
  if (repeaterDepth === 0) return null
  if (!allowedInRepeater(node.type)) return { field: 'type', message: `"${node.type}" cannot be placed inside a repeater` }
  if (node.type === REPEATER_TYPE) {
    return repeaterDepth >= MAX_REPEATER_DEPTH
      ? { field: 'type', message: 'repeaters nest at most two levels deep' }
      : null
  }
  if (getCoreElement(node.type)?.isContainer && node.name !== undefined) {
    return { field: 'name', message: `a ${node.type} inside a repeater item can't have a name (item data stays flat)` }
  }
  return null
}

/** A data path without its item indexes: `crew.0.bags.2` → `crew.bags`. */
export function templatePath(path: string): string {
  return path
    .split('.')
    .filter((segment) => !/^\d+$/.test(segment))
    .join('.')
}

/** The item indexes in a data path: `crew.0.bags.2.x` → [0, 2]. */
export function pathIndexes(path: string): number[] {
  return path
    .split('.')
    .filter((segment) => /^\d+$/.test(segment))
    .map(Number)
}

let itemKeyCounter = 0
/** A page-wide unique key for a new repeater item (radio group names use it). */
export function nextItemKey(): number {
  return itemKeyCounter++
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

/**
 * A fresh item object: every value field at its default, looking through
 * layout containers; an inner repeater holds its initial items.
 */
export function repeaterItemDefaults(node: ElementNode): Record<string, unknown> {
  const item: Record<string, unknown> = {}
  const walk = (nodes: ElementNode[]): void => {
    for (const child of nodes) {
      const core = getCoreElement(child.type)
      if (!core) continue
      if (isRepeater(child)) {
        if (child.name) {
          item[child.name] = Array.from({ length: repeaterLimits(child).initial }, () => repeaterItemDefaults(child))
        }
      } else if (core.isContainer) {
        walk(child.children ?? [])
      } else if (core.hasValue && child.name) {
        item[child.name] = child.props['default'] !== undefined ? child.props['default'] : core.defaultValue(child)
      }
    }
  }
  walk(node.children ?? [])
  return item
}

/** props.sortable: visitors may reorder items (move up / move down). */
export function repeaterSortable(node: ElementNode): boolean {
  return node.props['sortable'] === true
}

/** Label of item `index` (0-based): props.itemLabel with {n}, else fallback. */
/** Where index `i` ends up when the item at `from` moves to `to` (the rest close up). */
export function movedIndex(i: number, from: number, to: number): number {
  if (i === from) return to
  if (from < to) return i > from && i <= to ? i - 1 : i
  return i >= to && i < from ? i + 1 : i
}

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
