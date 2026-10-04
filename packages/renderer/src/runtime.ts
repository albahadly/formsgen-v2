// Tree-walking runtime shared by the <FormsGenForm> component, its
// validation pass, and (later) export targets' semantics tests: which value
// fields are visible for the current data, and what the submitted payload
// looks like (hidden fields are excluded from data and validation).

import { getValueByPath, isVisible } from './conditions'
import { getCoreElement } from './elements'
import type { ElementNode } from './schema'

export interface VisibleField {
  node: ElementNode
  /** Dot path of the field's value in the data object. */
  path: string
}

export function joinPath(parent: string, name: string): string {
  return parent === '' ? name : `${parent}.${name}`
}

/** Depth-first list of visible value-bearing fields with their data paths. */
export function collectVisibleFields(
  nodes: ElementNode[],
  data: Record<string, unknown>,
  parentPath = '',
): VisibleField[] {
  const lookup = (field: string) => getValueByPath(data, field)
  const fields: VisibleField[] = []
  for (const node of nodes) {
    if (!isVisible(node.conditions, lookup)) continue
    const core = getCoreElement(node.type)
    if (!core) continue
    if (core.isContainer) {
      const childPath = node.name ? joinPath(parentPath, node.name) : parentPath
      fields.push(...collectVisibleFields(node.children ?? [], data, childPath))
    } else if (core.hasValue && node.name) {
      fields.push({ node, path: joinPath(parentPath, node.name) })
    }
  }
  return fields
}

/** Data object containing only visible fields (nested per named containers). */
export function pickVisibleData(
  nodes: ElementNode[],
  data: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const { path } of collectVisibleFields(nodes, data)) {
    const segments = path.split('.')
    let target = out
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
    target[segments[segments.length - 1] as string] = getValueByPath(data, path)
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
