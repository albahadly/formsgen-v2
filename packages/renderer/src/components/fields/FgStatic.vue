<script setup lang="ts">
import { computed } from 'vue'
import type { ElementNode } from '../../schema'

const props = defineProps<{ node: ElementNode }>()

const text = computed(() => String(props.node.props['text'] ?? ''))
/** style.tone: text color (line color for a divider). */
const toneClass = computed(() => (props.node.style?.tone ? `fg-tone-${props.node.style.tone}` : undefined))
const level = computed(() => {
  const l = Number(props.node.props['level'] ?? 2)
  return l >= 1 && l <= 4 ? l : 2
})
</script>

<template>
  <hr
    v-if="node.type === 'divider'"
    class="fg-divider"
    :class="toneClass"
  >
  <p
    v-else-if="node.type === 'paragraph'"
    class="fg-paragraph"
    :class="toneClass"
  >
    {{ text }}
  </p>
  <component
    :is="`h${level}`"
    v-else
    class="fg-heading"
    :class="[`fg-heading--${level}`, toneClass]"
  >
    {{ text }}
  </component>
</template>
