<script setup lang="ts">
import type { ElementNode } from '@formsgen/renderer'
import { computed } from 'vue'
import { tText } from '@/i18n'
import { useBuilderStore } from '@/stores/builder'

const props = defineProps<{
  node: ElementNode
  prop: string
  label: string
  options: { value: string; label: string }[]
}>()

const store = useBuilderStore()
const value = computed({
  get: () => String(props.node.props[props.prop] ?? ''),
  set: (v: string) => {
    // Keep the stored type stable: numeric props stay numbers.
    const current = props.node.props[props.prop]
    store.updateProps(props.node.id, {
      [props.prop]: typeof current === 'number' ? Number(v) : v,
    })
  },
})
</script>

<template>
  <label class="flex flex-col gap-1 text-xs font-medium text-gray-600">
    {{ tText(label) }}
    <select
      v-model="value"
      class="rounded border border-gray-300 px-2 py-1.5 text-sm font-normal text-gray-900"
      :data-testid="`control-${prop}`"
    >
      <option
        v-for="option in options"
        :key="option.value"
        :value="option.value"
      >
        {{ tText(option.label) }}
      </option>
    </select>
  </label>
</template>
