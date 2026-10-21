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
  /** A textarea (e.g. paragraph text). */
  multiline?: boolean | undefined
  /** Small help text under the control. */
  hint?: string | undefined
}>()

const store = useBuilderStore()
/** Props holding code or addresses: shown left to right in every UI language. */
const LTR_PROPS = new Set(['html', 'tiles', 'src', 'href', 'url', 'formula'])
const value = computed({
  get: () => String(props.node.props[props.prop] ?? ''),
  set: (v: string) => store.updateProps(props.node.id, { [props.prop]: v }),
})
</script>

<template>
  <label class="flex flex-col gap-1 text-xs font-medium text-gray-600 dark:text-gray-300">
    {{ tText(label) }}
    <textarea
      v-if="multiline"
      v-model="value"
      rows="4"
      class="rounded border border-gray-300 dark:border-gray-600 px-2 py-1.5 text-sm font-normal text-gray-900 dark:text-gray-100"
      :placeholder="placeholder ? tText(placeholder) : undefined"
      :data-testid="`control-${prop}`"
      :dir="prop === 'html' ? 'ltr' : undefined"
    />
    <input
      v-else
      v-model="value"
      type="text"
      class="rounded border border-gray-300 dark:border-gray-600 px-2 py-1.5 text-sm font-normal text-gray-900 dark:text-gray-100"
      :placeholder="placeholder ? tText(placeholder) : undefined"
      :data-testid="`control-${prop}`"
      :dir="LTR_PROPS.has(prop) ? 'ltr' : undefined"
    >
    <span
      v-if="hint"
      class="text-[11px] font-normal text-gray-500 dark:text-gray-400"
      :data-testid="`control-${prop}-hint`"
    >{{ tText(hint) }}</span>
  </label>
</template>
