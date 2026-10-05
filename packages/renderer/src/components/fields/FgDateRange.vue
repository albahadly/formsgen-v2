<script setup lang="ts">
// Date range: two native date inputs; the end can't be before the start
// (built-in check, and the end input's min follows the start).
import { computed } from 'vue'
import { MESSAGES } from '../../messages'
import type { ElementNode } from '../../schema'
import { useField } from '../useField'
import FgFieldLabel from './FgFieldLabel.vue'

const props = defineProps<{ node: ElementNode; path: string }>()
const { ctx, value, error, label, description, fieldId, errorId, describedBy, onBlur, sizeClass } =
  useField(props)

const messages = computed(() => ctx.messages?.() ?? MESSAGES.en)
const current = computed(() => {
  const v = value.value as { from?: unknown; to?: unknown } | null
  return { from: typeof v?.from === 'string' ? v.from : '', to: typeof v?.to === 'string' ? v.to : '' }
})

function set(side: 'from' | 'to', event: Event): void {
  value.value = { ...current.value, [side]: (event.target as HTMLInputElement).value }
}
</script>

<template>
  <div
    class="fg-field"
    :class="{ 'fg-field--error': error }"
  >
    <FgFieldLabel
      :node="node"
      :for-id="fieldId"
    />
    <div class="fg-pair">
      <input
        :id="fieldId"
        class="fg-input"
        :class="sizeClass"
        type="date"
        :name="node.name ? `${node.name}_from` : undefined"
        :value="current.from"
        :aria-label="`${label}: ${messages.dateFrom}`"
        :aria-invalid="error ? 'true' : undefined"
        :aria-describedby="describedBy"
        @input="set('from', $event)"
        @blur="onBlur"
      >
      <span aria-hidden="true">–</span>
      <input
        :id="`${fieldId}-to`"
        class="fg-input"
        :class="sizeClass"
        type="date"
        :name="node.name ? `${node.name}_to` : undefined"
        :value="current.to"
        :min="current.from || undefined"
        :aria-label="`${label}: ${messages.dateTo}`"
        :aria-invalid="error ? 'true' : undefined"
        :aria-describedby="describedBy"
        @input="set('to', $event)"
        @blur="onBlur"
      >
    </div>
    <p
      v-if="description"
      class="fg-description"
    >
      {{ description }}
    </p>
    <p
      v-if="error"
      :id="errorId"
      class="fg-error"
      role="alert"
    >
      {{ error }}
    </p>
  </div>
</template>
