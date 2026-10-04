// The builder's single source of truth. EVERY schema mutation goes through
// an action here — phase 6 wraps these in undo/redo history, so no component
// may touch `schema` directly.

import {
  NAME_PATTERN,
  SCHEMA_ID,
  SECTION_CONTAINERS,
  REPEATER_TYPE,
  SECTION_TYPES,
  allowedInRepeater,
  THEME_TOKEN_PATTERN,
  collectNames,
  findNodeById,
  findParent,
  getCoreElement,
  isSafeThemeValue,
  uniqueName,
  walkTree,
  type ColSpan,
  type ConditionGroups,
  type ElementNode,
  type ElementStyle,
  type FormMeta,
  type FormSchema,
  type Rule,
} from '@formsgen/renderer'
import { nanoid } from 'nanoid'
import { defineStore } from 'pinia'
import { localizeNewNode } from '@/registry/contentDefaults'
import { createSection } from '@/registry/elements/sections'
import { createNode } from '@/registry/factory'

export function createEmptySchema(): FormSchema {
  return {
    $schema: SCHEMA_ID,
    meta: {
      name: 'untitled_form',
      title: 'Untitled form',
      locale: 'en',
      dir: 'ltr',
    },
    tree: [],
  }
}

export type NameError = 'invalid' | 'duplicate' | null

export const useBuilderStore = defineStore('builder', {
  state: () => ({
    schema: createEmptySchema(),
    selectedId: null as string | null,
  }),
  getters: {
    selectedNode(state): ElementNode | null {
      return state.selectedId ? findNodeById(state.schema.tree, state.selectedId) : null
    },
    /** Names already used anywhere in the tree (for new-node naming). */
    takenNames(state): string[] {
      return collectNames(state.schema.tree)
    },
  },
  actions: {
    /**
     * Adds a new element of `type`. When the selection is a container that
     * accepts it, the element is added inside it (for tabs/steps hosts the
     * FIRST section receives it); otherwise it is appended at the root.
     */
    addElement(type: string): ElementNode {
      const node = localizeNewNode(createNode(type, this.takenNames), this.schema.meta.locale)
      let target = this.schema.tree
      const selected = this.selectedNode
      if (selected && getCoreElement(selected.type)?.isContainer) {
        if (acceptsChildType(selected.type, type)) {
          target = selected.children ??= []
        } else if (SECTION_CONTAINERS[selected.type]) {
          // Selected a tabs/steps host: drop into its first section.
          const first = (selected.children ?? []).find(
            (c) => c.type === SECTION_CONTAINERS[selected.type],
          )
          if (first && acceptsChildType(first.type, type)) target = first.children ??= []
        }
      }
      if (target === this.schema.tree && !acceptsChildType(null, type)) {
        // Section nodes can't live at the root; wrap-less add is refused.
        return node
      }
      target.push(node)
      this.selectedId = node.id
      return node
    },

    /** Appends a new tab/step to a tabs/steps host and selects it. */
    addSection(hostId: string): ElementNode | null {
      const host = findNodeById(this.schema.tree, hostId)
      const kind = host ? SECTION_CONTAINERS[host.type] : undefined
      if (!host || !kind) return null
      const section = localizeNewNode(
        createSection(kind as 'tab' | 'step', (host.children?.length ?? 0) + 1),
        this.schema.meta.locale,
      )
      ;(host.children ??= []).push(section)
      this.selectedId = section.id
      return section
    },

    removeElement(id: string): void {
      const prune = (nodes: ElementNode[]): ElementNode[] =>
        nodes.filter((n) => n.id !== id).map((n) => {
          if (n.children) n.children = prune(n.children)
          return n
        })
      this.schema.tree = prune(this.schema.tree)
      if (this.selectedId === id) this.selectedId = null
    },

    select(id: string | null): void {
      this.selectedId = id
    },

    /** Shallow-merges a props patch into the node. */
    updateProps(id: string, patch: Record<string, unknown>): void {
      const node = findNodeById(this.schema.tree, id)
      if (node) Object.assign(node.props, patch)
    },

    /** Renames the node's data key; returns the reason when rejected. */
    setName(id: string, name: string): NameError {
      const node = findNodeById(this.schema.tree, id)
      if (!node) return null
      if (!NAME_PATTERN.test(name)) return 'invalid'
      const parent = findParent(this.schema.tree, id)
      const siblings = parent ? (parent.children ?? []) : this.schema.tree
      if (siblings.some((s) => s.id !== id && s.name === name)) return 'duplicate'
      node.name = name
      return null
    },

    setColSpan(id: string, span: ColSpan | undefined): void {
      const node = findNodeById(this.schema.tree, id)
      if (!node) return
      if (span === undefined) {
        delete node.layout
      } else {
        node.layout = { ...node.layout, colSpan: span }
      }
    },

    setValidation(id: string, rules: Rule[]): void {
      const node = findNodeById(this.schema.tree, id)
      if (!node) return
      if (rules.length === 0) {
        delete node.validation
      } else {
        node.validation = rules
      }
    },

    /**
     * Merges appearance options. Defaults (undefined, false, '') are removed
     * rather than stored, and `style` disappears entirely when nothing is left.
     */
    setStyle(id: string, patch: Partial<ElementStyle>): void {
      const node = findNodeById(this.schema.tree, id)
      if (!node) return
      const merged: Record<string, unknown> = { ...node.style, ...patch }
      for (const [key, value] of Object.entries(merged)) {
        if (value === undefined || value === false || value === '') delete merged[key]
      }
      if (Object.keys(merged).length === 0) {
        delete node.style
      } else {
        node.style = merged as ElementStyle
      }
    },

    /** Visibility conditions (OR of AND groups); empty groups are dropped. */
    setConditions(id: string, groups: ConditionGroups): void {
      const node = findNodeById(this.schema.tree, id)
      if (!node) return
      const kept = groups.filter((group) => group.length > 0)
      if (kept.length === 0) {
        delete node.conditions
      } else {
        node.conditions = kept
      }
    },

    /** Re-points condition references after fields changed data path. */
    rewriteConditionFields(renames: ReadonlyMap<string, string>): void {
      walkTree(this.schema.tree, (node) => {
        for (const group of node.conditions ?? []) {
          for (const condition of group) {
            const next = renames.get(condition.field)
            if (next !== undefined) condition.field = next
          }
        }
      })
    },

    /**
     * Replaces a container's (or the root's) child list. Drag-and-drop
     * routes through here so every mutation stays store-mediated.
     */
    setChildren(parentId: string | null, children: ElementNode[]): void {
      if (parentId === null) {
        this.schema.tree = children
        return
      }
      const parent = findNodeById(this.schema.tree, parentId)
      if (parent && getCoreElement(parent.type)?.isContainer) {
        parent.children = children
      }
    },

    /** Deep-clones a node with fresh ids and re-uniqued names; selects it. */
    duplicateElement(id: string): ElementNode | null {
      const source = findNodeById(this.schema.tree, id)
      if (!source) return null
      const taken = new Set(this.takenNames)
      const cloneNode = (node: ElementNode): ElementNode => {
        // JSON clone: schema nodes are JSON-safe, and the source is a Vue
        // reactive proxy that structuredClone refuses.
        const copy = JSON.parse(JSON.stringify(node)) as ElementNode
        copy.id = nanoid(10)
        if (copy.name) {
          copy.name = uniqueName(copy.name, taken)
          taken.add(copy.name)
        }
        if (copy.children) copy.children = copy.children.map(cloneNode)
        return copy
      }
      const copy = cloneNode(source)
      const parent = findParent(this.schema.tree, id)
      const siblings = parent ? (parent.children ??= []) : this.schema.tree
      siblings.splice(siblings.findIndex((n) => n.id === id) + 1, 0, copy)
      this.selectedId = copy.id
      return copy
    },

    /** Merges a patch into the form's meta (settings dialog). */
    updateMeta(patch: Partial<FormMeta>): void {
      Object.assign(this.schema.meta, patch)
    },

    /** Renames the form (slug-validated); returns the reason when rejected. */
    setMetaName(name: string): NameError {
      if (!NAME_PATTERN.test(name)) return 'invalid'
      this.schema.meta.name = name
      return null
    },

    /** Sets or removes one theme token on meta.theme. */
    /** Sets or clears (null / '') one theme token; unsafe values are refused. */
    setThemeToken(token: string, value: string | null): boolean {
      const theme = { ...(this.schema.meta.theme ?? {}) }
      if (value === null || value === '') {
        delete theme[token]
      } else if (THEME_TOKEN_PATTERN.test(token) && isSafeThemeValue(value)) {
        theme[token] = value
      } else {
        return false
      }
      if (Object.keys(theme).length === 0) {
        delete this.schema.meta.theme
      } else {
        this.schema.meta.theme = theme
      }
      return true
    },

    /**
     * Replaces the theme's colors with a palette (null: default colors);
     * font, radius and spacing are kept.
     */
    applyThemeColors(colors: Readonly<Record<string, string>> | null): void {
      const theme: Record<string, string> = {}
      for (const [token, value] of Object.entries(this.schema.meta.theme ?? {})) {
        if (!token.startsWith('color-')) theme[token] = value
      }
      for (const [token, value] of Object.entries(colors ?? {})) {
        if (THEME_TOKEN_PATTERN.test(token) && isSafeThemeValue(value)) theme[token] = value
      }
      if (Object.keys(theme).length === 0) delete this.schema.meta.theme
      else this.schema.meta.theme = theme
    },

    /** Removes every theme token (back to the built-in look). */
    resetTheme(): void {
      delete this.schema.meta.theme
    },

    /** Replaces the whole schema (project open / draft restore). */
    loadSchema(schema: FormSchema): void {
      this.schema = schema
      this.selectedId = null
    },

    /** Keyboard DnD: swaps the node with a sibling (delta -1 or +1). */
    moveSibling(id: string, delta: -1 | 1): boolean {
      const parent = findParent(this.schema.tree, id)
      const siblings = parent ? (parent.children ?? []) : this.schema.tree
      const index = siblings.findIndex((n) => n.id === id)
      const target = index + delta
      if (index === -1 || target < 0 || target >= siblings.length) return false
      const [node] = siblings.splice(index, 1)
      siblings.splice(target, 0, node!)
      return true
    },

    /** Keyboard DnD: lifts the node out of its container, placed after it. */
    moveOut(id: string): boolean {
      const parent = findParent(this.schema.tree, id)
      if (!parent) return false
      const grandparent = findParent(this.schema.tree, parent.id)
      const node = findNodeById(this.schema.tree, id)!
      if (!acceptsChildType(grandparent?.type ?? null, node.type)) return false
      const targetList = grandparent ? (grandparent.children ?? []) : this.schema.tree
      parent.children = (parent.children ?? []).filter((n) => n.id !== id)
      targetList.splice(targetList.findIndex((n) => n.id === parent.id) + 1, 0, node)
      return true
    },

    /** Keyboard DnD: moves the node into the nearest preceding container. */
    moveInto(id: string): boolean {
      const parent = findParent(this.schema.tree, id)
      const siblings = parent ? (parent.children ?? []) : this.schema.tree
      const index = siblings.findIndex((n) => n.id === id)
      const node = siblings[index]
      if (!node) return false
      for (let i = index - 1; i >= 0; i--) {
        const candidate = siblings[i]!
        if (
          getCoreElement(candidate.type)?.isContainer &&
          canDropInto(this.schema.tree, node, candidate.id)
        ) {
          siblings.splice(index, 1)
          ;(candidate.children ??= []).push(node)
          return true
        }
      }
      return false
    },

    reset(): void {
      this.schema = createEmptySchema()
      this.selectedId = null
    },
  },
})

/** Height of a node's subtree (a leaf is 1). */
export function subtreeHeight(node: ElementNode): number {
  if (!node.children || node.children.length === 0) return 1
  return 1 + Math.max(...node.children.map(subtreeHeight))
}

/** Depth of the list a parent provides (root list = 0, inside a root container = 1, …). */
export function containerDepth(tree: ElementNode[], parentId: string | null): number {
  if (parentId === null) return 0
  let depth = 1
  let current = findParent(tree, parentId)
  while (current) {
    depth++
    current = findParent(tree, current.id)
  }
  return depth
}

export const MAX_NESTING_DEPTH = 5

/**
 * Type-level containment rules: tabs/steps hosts accept ONLY their section
 * type, section nodes live ONLY in their host, and nothing else nests a
 * section, and repeaters take leaf elements only (no containers, no tags).
 * `parentType === null` means the root list.
 */
export function acceptsChildType(parentType: string | null, childType: string): boolean {
  const requiredHost = SECTION_TYPES[childType]
  if (requiredHost) return parentType === requiredHost
  const sectionOnly = parentType ? SECTION_CONTAINERS[parentType] : undefined
  if (sectionOnly) return false // host takes only its section type (handled above)
  if (parentType === REPEATER_TYPE) return allowedInRepeater(childType)
  return true
}

/**
 * Whether `node` may be dropped into the list owned by `targetParentId`:
 * type rules first, then never into its own subtree, then depth.
 */
export function canDropInto(
  tree: ElementNode[],
  node: ElementNode,
  targetParentId: string | null,
): boolean {
  const parent = targetParentId === null ? null : findNodeById(tree, targetParentId)
  if (targetParentId !== null && !parent) return false
  if (!acceptsChildType(parent?.type ?? null, node.type)) return false
  if (targetParentId !== null) {
    if (targetParentId === node.id) return false
    if (node.children && findNodeById(node.children, targetParentId)) return false
  }
  return containerDepth(tree, targetParentId) + subtreeHeight(node) <= MAX_NESTING_DEPTH
}
