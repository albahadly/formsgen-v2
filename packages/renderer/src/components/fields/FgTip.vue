<script setup lang="ts">
// Help tooltip: a small button whose tip shows on hover and focus (pure
// CSS). The tip describes the button; it never joins a field's name.
import { computed, inject } from 'vue'
import { FORM_CONTEXT } from '../../context'
import { MESSAGES } from '../../messages'

defineProps<{ text: string; id: string }>()
const ctx = inject(FORM_CONTEXT, null)
const messages = computed(() => ctx?.messages?.() ?? MESSAGES.en)
</script>

<template>
  <span class="fg-tip">
    <button
      type="button"
      class="fg-tip-button"
      :aria-label="messages.moreInfo"
      :aria-describedby="id"
    >?</button>
    <span
      :id="id"
      role="tooltip"
      class="fg-tip-text"
    >{{ text }}</span>
  </span>
</template>
