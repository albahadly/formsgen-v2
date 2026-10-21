// Draft autosave to localStorage. Browser storage is a per-viewer
// convenience only — the durable format is the .formsgen.json project file.
// Every read/write is wrapped: storage can be absent or throwing.

import { parseFormSchema, type FormSchema } from '@albahadly/formsgen-renderer'
import { watch } from 'vue'
import { useBuilderStore } from '@/stores/builder'

export const STORAGE_KEY = 'formsgen.draft.v1'
const SAVE_DEBOUNCE_MS = 500

export function readDraft(): FormSchema | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const result = parseFormSchema(JSON.parse(raw))
    if (!result.ok || result.schema.tree.length === 0) return null
    return result.schema
  } catch {
    return null
  }
}

export function clearDraft(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // storage unavailable — nothing to clear
  }
}

/** Starts debounced autosave of the builder schema. */
export function startAutosave(): void {
  const store = useBuilderStore()
  let timer: ReturnType<typeof setTimeout> | undefined
  watch(
    () => store.schema,
    () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(store.schema))
        } catch {
          // quota/unavailable — autosave silently off
        }
      }, SAVE_DEBOUNCE_MS)
    },
    { deep: true },
  )
}
