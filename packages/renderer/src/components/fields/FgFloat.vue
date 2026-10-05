<script setup lang="ts">
// Floating-label wrapper: the control, then its label (so CSS can float
// the label when the control is focused or filled). Without `floating`,
// the control renders alone (its label is rendered above it elsewhere).
import { computed, inject } from 'vue'
import { FORM_CONTEXT, ITEM_SCOPE } from '../../context'
import type { ElementNode } from '../../schema'

const props = defineProps<{ node: ElementNode; forId: string; floating: boolean }>()
const ctx = inject(FORM_CONTEXT, null)
const scope = inject(ITEM_SCOPE, null)
// Answers inside text ({field}) are inserted by the form.
const label = computed(() => {
  const text = String(props.node.props['label'] ?? '')
  return ctx?.pipe ? ctx.pipe(text, scope) : text
})
const required = computed(() => props.node.validation?.some((r) => r.rule === 'required') ?? false)
</script>

<template>
  <div
    v-if="floating"
    class="fg-floating"
  >
    <slot />
    <label
      class="fg-floating-label"
      :for="forId"
    >
      {{ label }}<span
        v-if="required"
        class="fg-required"
        aria-hidden="true"
      >*</span>
    </label>
  </div>
  <slot v-else />
</template>
