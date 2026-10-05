// Tree-walking runtime shared by the <FormsGenForm> component, its
// validation pass, and (later) export targets' semantics tests: which value
// fields are visible for the current data, and what the submitted payload
// looks like (hidden fields are excluded from data and validation).

import { getValueByPath, isVisible } from './conditions'
import { getCoreElement } from './elements'
import { isRepeater, resolveScoped, templatePath, type ItemScope } from './repeater'
import type { ElementNode } from './schema'

export interface VisibleField {
  node: ElementNode
  /** Dot path of the field's value in the data object. */
  path: string
  /** Set for fields inside a repeater item (resolves sibling references). */
  scope?: ItemScope
}

export function joinPath(parent: string, name: string): string {
  return parent === '' ? name : `${parent}.${name}`
}

/** Reads data by path; inside a repeater item, template paths hit that item. */
export function scopedLookup(
  data: Record<string, unknown>,
  scope: ItemScope | null | undefined,
): (field: string) => unknown {
  return (field) => getValueByPath(data, resolveScoped(field, scope))
}

function repeaterItems(data: Record<string, unknown>, path: string): unknown[] {
  const items = getValueByPath(data, path)
  return Array.isArray(items) ? items : []
}

/** Depth-first list of visible value-bearing fields with their data paths. */
export function collectVisibleFields(
  nodes: ElementNode[],
  data: Record<string, unknown>,
  parentPath = '',
  scope: ItemScope | null = null,
): VisibleField[] {
  const lookup = scopedLookup(data, scope)
  const fields: VisibleField[] = []
  for (const node of nodes) {
    if (!isVisible(node.conditions, lookup)) continue
    const core = getCoreElement(node.type)
    if (!core) continue
    if (isRepeater(node)) {
      if (!node.name) continue
      const path = joinPath(parentPath, node.name)
      repeaterItems(data, path).forEach((_, index) => {
        const itemPath = `${path}.${index}`
        fields.push(
          ...collectVisibleFields(node.children ?? [], data, itemPath, { template: templatePath(path), actual: itemPath, index }),
        )
      })
    } else if (core.isContainer) {
      const childPath = node.name ? joinPath(parentPath, node.name) : parentPath
      fields.push(...collectVisibleFields(node.children ?? [], data, childPath, scope))
    } else if (core.hasValue && node.name) {
      const field: VisibleField = { node, path: joinPath(parentPath, node.name) }
      if (scope) field.scope = scope
      fields.push(field)
    }
  }
  return fields
}

/** Every calculated field instance (visible or not), with its data path and item scope. */
export function collectCalculated(
  nodes: ElementNode[],
  data: Record<string, unknown>,
  parentPath = '',
  scope: ItemScope | null = null,
): VisibleField[] {
  const out: VisibleField[] = []
  for (const node of nodes) {
    const core = getCoreElement(node.type)
    if (!core) continue
    if (isRepeater(node)) {
      if (!node.name) continue
      const path = joinPath(parentPath, node.name)
      repeaterItems(data, path).forEach((_, index) => {
        const itemPath = `${path}.${index}`
        out.push(...collectCalculated(node.children ?? [], data, itemPath, { template: templatePath(path), actual: itemPath, index }))
      })
    } else if (core.isContainer) {
      out.push(...collectCalculated(node.children ?? [], data, node.name ? joinPath(parentPath, node.name) : parentPath, scope))
    } else if (node.type === 'calculated' && node.name) {
      const field: VisibleField = { node, path: joinPath(parentPath, node.name) }
      if (scope) field.scope = scope
      out.push(field)
    }
  }
  return out
}

/**
 * Data object containing only visible fields: named containers nest an
 * object (omitted when nothing inside is visible), repeaters an array.
 */
export function pickVisibleData(
  nodes: ElementNode[],
  data: Record<string, unknown>,
  parentPath = '',
  scope: ItemScope | null = null,
): Record<string, unknown> {
  const lookup = scopedLookup(data, scope)
  const out: Record<string, unknown> = {}
  for (const node of nodes) {
    if (!isVisible(node.conditions, lookup)) continue
    const core = getCoreElement(node.type)
    if (!core) continue
    if (isRepeater(node)) {
      if (!node.name) continue
      const path = joinPath(parentPath, node.name)
      out[node.name] = repeaterItems(data, path).map((_, index) => {
        const itemPath = `${path}.${index}`
        return pickVisibleData(node.children ?? [], data, itemPath, { template: templatePath(path), actual: itemPath, index })
      })
    } else if (core.isContainer) {
      if (node.name) {
        const inner = pickVisibleData(node.children ?? [], data, joinPath(parentPath, node.name), scope)
        if (Object.keys(inner).length > 0) out[node.name] = inner
      } else {
        Object.assign(out, pickVisibleData(node.children ?? [], data, parentPath, scope))
      }
    } else if (core.hasValue && node.name) {
      out[node.name] = getValueByPath(data, joinPath(parentPath, node.name))
    }
  }
  return out
}

/** Writes a dot-path value into nested data, creating objects as needed. */
export function setValueByPath(
  data: Record<string, unknown>,
  path: string,
  value: unknown,
): void {
  const segments = path.split('.')
  let target = data
  for (const segment of segments.slice(0, -1)) {
    const next = target[segment]
    if (typeof next === 'object' && next !== null) {
      target = next as Record<string, unknown>
    } else {
      const created: Record<string, unknown> = {}
      target[segment] = created
      target = created
    }
  }
  target[segments[segments.length - 1] as string] = value
}
