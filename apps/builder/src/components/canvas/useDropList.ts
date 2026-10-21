// Shared drag-and-drop wiring for a node list (the root, or a container's
// children). Keeps every structural mutation routed through store actions
// and enforces the drop rules (no self-nesting, max depth) centrally.

import type { ElementNode } from '@albahadly/formsgen-renderer'
import { computed } from 'vue'
import { canDropInto, useBuilderStore } from '@/stores/builder'

interface MoveEvent {
  draggedContext: { element: ElementNode }
  to: HTMLElement
}

/**
 * SortableJS `direction` for the canvas lists. They are the renderer's
 * 12-column grid, which Sortable reads as horizontal and would then place a
 * drop by the pointer's x; a target that fills its row is a vertical stack,
 * one that shares its row (a half-width cell) is a horizontal one.
 */
export function dropDirection(_event: Event, target: HTMLElement | null): 'vertical' | 'horizontal' {
  const grid = target?.parentElement
  if (!target || !grid) return 'vertical'
  return target.getBoundingClientRect().width < grid.clientWidth * 0.9 ? 'horizontal' : 'vertical'
}

export function useDropList(parentId: () => string | null) {
  const store = useBuilderStore()

  const list = computed<ElementNode[]>({
    get: () => {
      const id = parentId()
      if (id === null) return store.schema.tree
      const parent = store.schema.tree && id ? findParentList(id) : []
      return parent
    },
    set: (nodes) => store.setChildren(parentId(), nodes),
  })

  function findParentList(id: string): ElementNode[] {
    const walk = (nodes: ElementNode[]): ElementNode[] | null => {
      for (const node of nodes) {
        if (node.id === id) return node.children ?? []
        if (node.children) {
          const found = walk(node.children)
          if (found) return found
        }
      }
      return null
    }
    return walk(store.schema.tree) ?? []
  }

  /** SortableJS move guard; the target list carries data-parent-id. */
  function onMove(event: MoveEvent): boolean {
    const targetParent = event.to.dataset['parentId'] ?? null
    const normalized = targetParent === '' ? null : targetParent
    return canDropInto(store.schema.tree, event.draggedContext.element, normalized)
  }

  /** A node dropped from the palette (clone) or moved in becomes selected. */
  function onAdd(event: { newIndex?: number }): void {
    const nodes = list.value
    const added = typeof event.newIndex === 'number' ? nodes[event.newIndex] : undefined
    if (added) store.select(added.id)
  }

  return { list, onMove, onAdd }
}
