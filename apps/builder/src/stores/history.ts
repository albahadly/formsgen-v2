// Snapshot-based undo/redo over the builder schema. A debounce window
// batches rapid mutations (a cross-container drag emits two setChildren
// calls) into ONE history entry. Selection changes never create entries.

import { findNodeById } from '@formsgen/renderer'
import { defineStore } from 'pinia'
import { watch } from 'vue'
import { useBuilderStore } from './builder'

export const HISTORY_LIMIT = 50
const DEBOUNCE_MS = 120

export const useHistoryStore = defineStore('history', {
  state: () => ({
    past: [] as string[],
    future: [] as string[],
    /** Serialized schema the tree currently matches. */
    current: '',
    /** True while undo/redo writes the schema (suppresses tracking). */
    applying: false,
    pending: false,
  }),
  getters: {
    canUndo: (state) => state.past.length > 0,
    canRedo: (state) => state.future.length > 0,
  },
  actions: {
    /** Call once at app start, after any draft restore. */
    start(): void {
      const builder = useBuilderStore()
      this.current = JSON.stringify(builder.schema)
      watch(
        () => builder.schema,
        () => this.onChange(),
        { deep: true },
      )
    },

    onChange(): void {
      if (this.applying || this.pending) return
      this.pending = true
      setTimeout(() => {
        this.pending = false
        this.commit()
      }, DEBOUNCE_MS)
    },

    /** Records the current schema as a history entry if it changed. */
    commit(): void {
      if (this.applying) return
      const builder = useBuilderStore()
      const snapshot = JSON.stringify(builder.schema)
      if (snapshot === this.current) return
      this.past.push(this.current)
      if (this.past.length > HISTORY_LIMIT) this.past.shift()
      this.future = []
      this.current = snapshot
    },

    /** Re-baselines without an entry (project open, draft restore). */
    reset(): void {
      const builder = useBuilderStore()
      this.past = []
      this.future = []
      this.current = JSON.stringify(builder.schema)
    },

    undo(): void {
      if (this.past.length === 0) return
      this.commit() // flush any pending edit first
      if (this.past.length === 0) return
      this.future.push(this.current)
      this.current = this.past.pop()!
      this.apply()
    },

    redo(): void {
      if (this.future.length === 0) return
      this.past.push(this.current)
      this.current = this.future.pop()!
      this.apply()
    },

    apply(): void {
      const builder = useBuilderStore()
      this.applying = true
      builder.schema = JSON.parse(this.current)
      // Drop the selection if the node no longer exists in this version.
      if (builder.selectedId && !findNodeById(builder.schema.tree, builder.selectedId)) {
        builder.selectedId = null
      }
      // The deep watcher fires on next flush; lift the guard afterwards.
      setTimeout(() => {
        this.applying = false
      }, 0)
    },
  },
})
