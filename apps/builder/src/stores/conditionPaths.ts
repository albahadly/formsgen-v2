// Keeps condition references valid when a field's data path changes —
// renaming the field or a named group around it, or dragging it into or out
// of a named group. Conditions store root-relative paths, so without this a
// reference would silently stop matching and its element would never show.

import { getCoreElement, joinPath, type ElementNode } from '@formsgen/renderer'
import { watch, type WatchStopHandle } from 'vue'
import { useBuilderStore } from './builder'

/** Data path of every named value field, keyed by node id. */
export function fieldPathsById(tree: ElementNode[]): Map<string, string> {
  const paths = new Map<string, string>()
  const walk = (nodes: ElementNode[], base: string): void => {
    for (const node of nodes) {
      const core = getCoreElement(node.type)
      if (!core) continue
      if (core.isContainer) {
        walk(node.children ?? [], node.name ? joinPath(base, node.name) : base)
      } else if (core.hasValue && node.name) {
        paths.set(node.id, joinPath(base, node.name))
      }
    }
  }
  walk(tree, '')
  return paths
}

/**
 * Starts tracking (call once at app start). Edits mutate the schema in
 * place and get their references rewritten; undo/redo, opening a project
 * and "start fresh" REPLACE the schema object, which only re-baselines —
 * a restored snapshot is already self-consistent.
 */
export function startConditionPathTracking(): WatchStopHandle {
  const builder = useBuilderStore()
  let tracked = builder.schema
  let known = fieldPathsById(builder.schema.tree)
  // Default (pre) flush batches a cross-container drag's two list updates
  // into one run, so the moved field is seen at its final path.
  return watch(
    () => builder.schema.tree,
    () => {
      const current = fieldPathsById(builder.schema.tree)
      if (builder.schema !== tracked) {
        tracked = builder.schema
        known = current
        return
      }
      const renames = new Map<string, string>()
      for (const [id, path] of current) {
        const previous = known.get(id)
        if (previous !== undefined && previous !== path) renames.set(previous, path)
        known.set(id, path)
      }
      if (renames.size > 0) builder.rewriteConditionFields(renames)
    },
    { deep: true },
  )
}
