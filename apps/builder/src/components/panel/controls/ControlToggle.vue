<script setup lang="ts">
import type { ElementNode } from '@formsgen/renderer'
import { computed } from 'vue'
import { tText } from '@/i18n'
import { useBuilderStore } from '@/stores/builder'

const props = defineProps<{
  node: ElementNode
  prop: string
  label: string
  /** The prop holds this string while on (e.g. format: 'markdown'), instead of true. */
  on?: string | undefined
}>()

const store = useBuilderStore()
const value = computed({
  get: () => props.node.props[props.prop] === (props.on ?? true),
  set: (v: boolean) => store.updateProps(props.node.id, { [props.prop]: props.on === undefined ? v : v ? props.on : undefined }),
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
