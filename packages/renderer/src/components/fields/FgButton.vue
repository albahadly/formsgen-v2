<script setup lang="ts">
// Button element: resets the form, or links somewhere styled as a button.
import { computed, inject } from 'vue'
import { FORM_CONTEXT } from '../../context'
import { isSafeUrl } from '../../elements'
import { MESSAGES } from '../../messages'
import type { ElementNode } from '../../schema'

const props = defineProps<{ node: ElementNode }>()
const ctx = inject(FORM_CONTEXT, null)
const messages = computed(() => ctx?.messages?.() ?? MESSAGES.en)

const text = computed(() => String(props.node.props['text'] ?? ''))
const isLink = computed(() => props.node.props['action'] === 'link')
const href = computed(() => {
  const value = props.node.props['href']
  return isSafeUrl(value) ? value.trim() : undefined
})
const newTab = computed(() => props.node.props['newTab'] === true)
const variantClass = computed(() => {
  const variant = props.node.props['variant']
  return `fg-button--${variant === 'secondary' || variant === 'danger' ? variant : 'primary'}`
})
</script>

<template>
  <a
    v-if="isLink"
    class="fg-button"
    :class="variantClass"
    :href="href"
    :target="newTab ? '_blank' : undefined"
    :rel="newTab ? 'noopener noreferrer' : undefined"
  >{{ text }}<span
    v-if="newTab"
    class="fg-sr-only"
  >{{ ` ${messages.opensInNewTab}` }}</span></a>
  <button
    v-else
    type="button"
    class="fg-button"
    :class="variantClass"
    @click="ctx?.reset?.()"
  >
    {{ text }}
  </button>
</template>
