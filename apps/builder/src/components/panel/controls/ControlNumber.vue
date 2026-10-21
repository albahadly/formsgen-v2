<script setup lang="ts">
import type { ElementNode } from '@albahadly/formsgen-renderer'
import { computed } from 'vue'
import { tText } from '@/i18n'
import { useBuilderStore } from '@/stores/builder'

const props = defineProps<{
  node: ElementNode
  prop: string
  label: string
  min?: number | undefined
  max?: number | undefined
}>()

const store = useBuilderStore()
const value = computed({
  get: () => {
    const v = props.node.props[props.prop]
    return typeof v === 'number' ? v : ''
  },
  set: (v: number | '') => {
    if (v === '' || !Number.isFinite(Number(v))) {
      store.updateProps(props.node.id, { [props.prop]: undefined })
      return
    }
    // Kept inside the range the renderer accepts (it would fall back silently).
    let n = Number(v)
    if (props.min !== undefined) n = Math.max(props.min, n)
    if (props.max !== undefined) n = Math.min(props.max, n)
    store.updateProps(props.node.id, { [props.prop]: n })
  },
})
</script>

<template>
  <label class="flex flex-col gap-1 text-xs font-medium text-gray-600 dark:text-gray-300">
    {{ tText(label) }}
    <input
      v-model.number="value"
      type="number"
      class="rounded border border-gray-300 dark:border-gray-600 px-2 py-1.5 text-sm font-normal text-gray-900 dark:text-gray-100"
      :min="min"
      :max="max"
      :data-testid="`control-${prop}`"
    >
  </label>
</template>
