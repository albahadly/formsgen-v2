// Pure helpers over the ElementNode tree. No Vue here — these are shared by
// the renderer, the builder, and (later) the export generators.

import { getCoreElement } from './elements'
import { isRepeater, repeaterItemDefaults, repeaterLimits } from './repeater'
import type { ElementNode } from './schema'

/** Depth-first visit of every node; return false from the visitor to stop. */
export function walkTree(
  nodes: ElementNode[],
  visit: (node: ElementNode, parent: ElementNode | null) => boolean | void,
  parent: ElementNode | null = null,
): boolean {
  for (const node of nodes) {
    if (visit(node, parent) === false) return false
    if (node.children && walkTree(node.children, visit, node) === false) {
      return false
    }
  }
  return true
}

export function findNodeById(nodes: ElementNode[], id: string): ElementNode | null {
  let found: ElementNode | null = null
  walkTree(nodes, (node) => {
    if (node.id === id) {
      found = node
      return false
    }
    return undefined
  })
  return found
}

/** Parent of the node with `id`, or null when it is a root (or absent). */
export function findParent(nodes: ElementNode[], id: string): ElementNode | null {
  let found: ElementNode | null = null
  walkTree(nodes, (node, parent) => {
    if (node.id === id) {
      found = parent
      return false
    }
    return undefined
  })
  return found
}

/** All `name`s in the tree, depth-first. */
export function collectNames(nodes: ElementNode[]): string[] {
  const names: string[] = []
  walkTree(nodes, (node) => {
    if (node.name) names.push(node.name)
  })
  return names
}

/** `base`, or `base_2`, `base_3`, ... — first variant not in `taken`. */
export function uniqueName(base: string, taken: Iterable<string>): string {
  const set = new Set(taken)
  if (!set.has(base)) return base
  let i = 2
  while (set.has(`${base}_${i}`)) i++
  return `${base}_${i}`
}

/**
 * Initial form data for a tree: value elements contribute their default
 * under their `name`; a NAMED container nests an object; an unnamed
 * container is transparent (its children contribute to the current level).
 * Unnamed value elements and unknown types contribute nothing.
 */
export function buildDefaultData(nodes: ElementNode[]): Record<string, unknown> {
  const data: Record<string, unknown> = {}
  for (const node of nodes) {
    const core = getCoreElement(node.type)
    if (!core) continue
    if (isRepeater(node)) {
      if (node.name) {
        const { initial } = repeaterLimits(node)
        data[node.name] = Array.from({ length: initial }, () => repeaterItemDefaults(node))
      }
    } else if (core.isContainer) {
      const childData = buildDefaultData(node.children ?? [])
      if (node.name) {
        data[node.name] = childData
      } else {
        Object.assign(data, childData)
      }
    } else if (core.hasValue && node.name) {
      data[node.name] =
        node.props['default'] !== undefined ? node.props['default'] : core.defaultValue(node)
    }
  }
  return data
}
