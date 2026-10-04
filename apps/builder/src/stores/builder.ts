// The builder's single source of truth. EVERY schema mutation goes through
// an action here — phase 6 wraps these in undo/redo history, so no component
// may touch `schema` directly.

import {
  NAME_PATTERN,
  SCHEMA_ID,
  collectNames,
  findNodeById,
  findParent,
  getCoreElement,
  type ColSpan,
  type ElementNode,
  type FormSchema,
  type Rule,
} from '@formsgen/renderer'
import { defineStore } from 'pinia'
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
     * Adds a new element of `type`. When the selection is a container, the
     * element is added inside it; otherwise it is appended at the root.
     */
    addElement(type: string): ElementNode {
      const node = createNode(type, this.takenNames)
      const selected = this.selectedNode
      const target =
        selected && getCoreElement(selected.type)?.isContainer
          ? (selected.children ??= [])
          : this.schema.tree
      target.push(node)
      this.selectedId = node.id
      return node
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

    reset(): void {
      this.schema = createEmptySchema()
      this.selectedId = null
    },
  },
})
