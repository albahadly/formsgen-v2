// Design-mode FormContext for the canvas: the real renderer field
// components are rendered with live-ish values (so the designer can poke
// inputs) but without validation or submit behavior.

import {
  FORM_CONTEXT,
  buildDefaultData,
  getValueByPath,
  setValueByPath,
  type FormContext,
} from '@formsgen/renderer'
import { provide, reactive, watch } from 'vue'
import { useBuilderStore } from '@/stores/builder'

export function provideDesignContext(): void {
  const store = useBuilderStore()
  const data = reactive<Record<string, unknown>>(buildDefaultData(store.schema.tree))

  // Rebuild preview values when the tree's structure or defaults change,
  // keeping whatever the designer already typed where paths still exist.
  watch(
    () => store.schema.tree,
    (tree) => {
      const fresh = buildDefaultData(tree)
      for (const key of Object.keys(data)) delete data[key]
      Object.assign(data, fresh)
    },
    { deep: true },
  )

  const ctx: FormContext = {
    getValue: (path) => getValueByPath(data, path),
    setValue: (path, value) => setValueByPath(data, path, value),
    getError: () => null,
    touch: () => undefined,
    isSubmitted: () => false,
  }
  provide(FORM_CONTEXT, ctx)
}
