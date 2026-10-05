<script setup lang="ts">
// A field's <label>: text, required mark, extra content (slot), and the
// help tooltip beside it (outside the label, so it stays out of the
// field's accessible name).
import { computed } from 'vue'
import type { ElementNode } from '../../schema'
import FgTip from './FgTip.vue'

const props = defineProps<{ node: ElementNode; forId: string }>()
const label = computed(() => String(props.node.props['label'] ?? ''))
const required = computed(() => props.node.validation?.some((r) => r.rule === 'required') ?? false)
const labelClass = computed(() => (props.node.style?.hideLabel ? 'fg-sr-only' : 'fg-label'))
const tooltip = computed(() => {
  const t = props.node.props['tooltip']
  return typeof t === 'string' && t.trim() !== '' ? t : null
})
</script>

<template>
  <div
    v-if="tooltip"
    class="fg-label-row"
  >
    <label
      :class="labelClass"
      :for="forId"
    >
      {{ label }}<span
        v-if="required"
        class="fg-required"
        aria-hidden="true"
      >*</span>
      <slot />
    </label>
    <FgTip
      :id="`${forId}-tip`"
      :text="tooltip"
    />
  </div>
  <label
    v-else
    :class="labelClass"
    :for="forId"
  >
    {{ label }}<span
      v-if="required"
      class="fg-required"
      aria-hidden="true"
    >*</span>
    <slot />
  </label>
</template>
