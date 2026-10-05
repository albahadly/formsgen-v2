<script setup lang="ts">
// Two-handle range slider: two native range inputs over one painted track
// (the inputs only catch pointer events on their thumbs), so keyboard and
// screen-reader support stays native. The handles can't cross.
import { computed } from 'vue'
import { rangeBounds, rangePercent, rangeSliderDefault } from '../../composite'
import { MESSAGES } from '../../messages'
import type { ElementNode } from '../../schema'
import { useField } from '../useField'
import FgFieldLabel from './FgFieldLabel.vue'

const props = defineProps<{ node: ElementNode; path: string }>()
const { ctx, value, error, label, description, fieldId, errorId, describedBy, onBlur } =
  useField(props)

const messages = computed(() => ctx.messages?.() ?? MESSAGES.en)
const bounds = computed(() => rangeBounds(props.node))
const current = computed(() => {
  const v = value.value as { from?: unknown; to?: unknown } | null
  const fallback = rangeSliderDefault(props.node)
  return {
    from: typeof v?.from === 'number' ? v.from : fallback.from,
    to: typeof v?.to === 'number' ? v.to : fallback.to,
  }
})
const fill = computed(() => ({
  insetInlineStart: `${rangePercent(current.value.from, bounds.value)}%`,
  insetInlineEnd: `${100 - rangePercent(current.value.to, bounds.value)}%`,
}))
// With both handles together, the one that can still move is on top.
const fromOnTop = computed(
  () => current.value.from === current.value.to && current.value.from > (bounds.value.min + bounds.value.max) / 2,
)

function set(side: 'from' | 'to', event: Event): void {
  const input = event.target as HTMLInputElement
  const n = Number(input.value)
  const next = { ...current.value }
  next[side] = side === 'from' ? Math.min(n, next.to) : Math.max(n, next.from)
  input.value = String(next[side])
  value.value = next
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
    >
      <span class="fg-range-value">{{ current.from }} – {{ current.to }}</span>
    </FgFieldLabel>
    <div class="fg-dual">
      <div class="fg-dual-track">
        <div
          class="fg-dual-fill"
          :style="fill"
        />
      </div>
      <input
        :id="fieldId"
        type="range"
        :name="node.name ? `${node.name}_from` : undefined"
        :value="current.from"
        :min="bounds.min"
        :max="bounds.max"
        :step="bounds.step"
        :aria-label="`${label}: ${messages.rangeFrom}`"
        :aria-describedby="describedBy"
        :style="{ zIndex: fromOnTop ? 3 : 1 }"
        @input="set('from', $event)"
        @blur="onBlur"
      >
      <input
        :id="`${fieldId}-to`"
        type="range"
        :name="node.name ? `${node.name}_to` : undefined"
        :value="current.to"
        :min="bounds.min"
        :max="bounds.max"
        :step="bounds.step"
        :aria-label="`${label}: ${messages.rangeTo}`"
        :aria-describedby="describedBy"
        :style="{ zIndex: 2 }"
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
