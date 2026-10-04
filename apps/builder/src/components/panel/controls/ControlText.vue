<script setup lang="ts">
import type { ElementNode } from '@formsgen/renderer'
import { computed } from 'vue'
import { tText } from '@/i18n'
import { useBuilderStore } from '@/stores/builder'

const props = defineProps<{
  node: ElementNode
  prop: string
  label: string
  placeholder?: string | undefined
}>()

const store = useBuilderStore()
const value = computed({
  get: () => String(props.node.props[props.prop] ?? ''),
  set: (v: string) => store.updateProps(props.node.id, { [props.prop]: v }),
})
</script>

<template>
  <label class="flex flex-col gap-1 text-xs font-medium text-gray-600">
    {{ tText(label) }}
    <input
      v-model="value"
      type="text"
      class="rounded border border-gray-300 px-2 py-1.5 text-sm font-normal text-gray-900"
      :placeholder="placeholder ? tText(placeholder) : undefined"
      :data-testid="`control-${prop}`"
    >
  </label>
</template>
