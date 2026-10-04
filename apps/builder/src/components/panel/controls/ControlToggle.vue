<script setup lang="ts">
import type { ElementNode } from '@formsgen/renderer'
import { computed } from 'vue'
import { tText } from '@/i18n'
import { useBuilderStore } from '@/stores/builder'

const props = defineProps<{
  node: ElementNode
  prop: string
  label: string
}>()

const store = useBuilderStore()
const value = computed({
  get: () => props.node.props[props.prop] === true,
  set: (v: boolean) => store.updateProps(props.node.id, { [props.prop]: v }),
})
</script>

<template>
  <label class="flex items-center gap-2 text-xs font-medium text-gray-600">
    <input
      v-model="value"
      type="checkbox"
      class="h-4 w-4 accent-indigo-600"
      :data-testid="`control-${prop}`"
    >
    {{ tText(label) }}
  </label>
</template>
