<script setup lang="ts">
import { pinsLightScheme, themeInlineStyle } from '@formsgen/renderer'
import { computed } from 'vue'
import draggable from 'vuedraggable'
import { t } from '@/i18n'
import { useBuilderStore } from '@/stores/builder'
import { useUiStore } from '@/stores/ui'
import BuilderNode from './BuilderNode.vue'
import { provideDesignContext } from './designContext'
import { useDropList } from './useDropList'

const store = useBuilderStore()
const ui = useUiStore()
provideDesignContext()

const { list, onMove, onAdd } = useDropList(() => null)
const isEmpty = computed(() => store.schema.tree.length === 0)
const themeVars = computed(() => themeInlineStyle(store.schema.meta.theme))

function onBackgroundClick(): void {
  store.select(null)
}

/** Flattened visible node ids, for arrow-key selection. */
const flatIds = computed<string[]>(() => {
  const ids: string[] = []
  const walk = (nodes: typeof store.schema.tree): void => {
    for (const node of nodes) {
      ids.push(node.id)
      if (node.children) walk(node.children)
    }
  }
  walk(store.schema.tree)
  return ids
})

function onKeydown(event: KeyboardEvent): void {
  // Never steal keys from inputs rendered inside the canvas.
  const target = event.target as HTMLElement
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return

  if (event.key === 'Escape') {
    store.select(null)
  } else if (event.altKey && event.key.startsWith('Arrow') && store.selectedId) {
    // Keyboard alternative to drag-and-drop (Alt+Arrows).
    event.preventDefault()
    const id = store.selectedId
    if (event.key === 'ArrowUp') store.moveSibling(id, -1)
    else if (event.key === 'ArrowDown') store.moveSibling(id, 1)
    else if (event.key === 'ArrowLeft') store.moveOut(id)
    else if (event.key === 'ArrowRight') store.moveInto(id)
  } else if ((event.key === 'Delete' || event.key === 'Backspace') && store.selectedId) {
    event.preventDefault()
    store.removeElement(store.selectedId)
  } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'd') {
    if (store.selectedId) {
      event.preventDefault()
      store.duplicateElement(store.selectedId)
    }
  } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault()
    const ids = flatIds.value
    if (ids.length === 0) return
    const index = store.selectedId ? ids.indexOf(store.selectedId) : -1
    const next =
      event.key === 'ArrowDown'
        ? ids[Math.min(index + 1, ids.length - 1)]
        : ids[Math.max(index - 1, 0)]
    if (next) store.select(next)
  }
}
</script>

<template>
  <div
    class="h-full overflow-y-auto p-6 focus:outline-none"
    data-testid="panel-canvas"
    tabindex="0"
    @click="onBackgroundClick"
    @keydown="onKeydown"
  >
    <div
      class="fg-form mx-auto rounded-lg p-6 shadow-sm transition-all"
      :style="[themeVars, { maxWidth: ui.deviceWidth === '100%' ? '42rem' : ui.deviceWidth }]"
      :data-fg-theme="pinsLightScheme(store.schema.meta.theme) ? 'light' : ui.previewTheme"
      :dir="store.schema.meta.dir"
    >
      <draggable
        v-model="list"
        item-key="id"
        group="canvas"
        class="flex min-h-24 flex-col gap-2"
        data-parent-id=""
        ghost-class="opacity-40"
        :move="onMove"
        @add="onAdd"
      >
        <template #item="{ element }">
          <BuilderNode
            :node="element"
            parent-path=""
          />
        </template>
        <template #footer>
          <p
            v-if="isEmpty"
            class="py-16 text-center text-sm text-gray-400"
            data-testid="canvas-empty"
          >
            {{ t('canvas.empty') }}
          </p>
        </template>
      </draggable>
    </div>
  </div>
</template>
