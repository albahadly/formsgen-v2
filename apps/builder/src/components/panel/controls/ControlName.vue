<script setup lang="ts">
import type { ElementNode } from '@albahadly/formsgen-renderer'
import { ref, watch } from 'vue'
import { t } from '@/i18n'
import { useBuilderStore, type NameError } from '@/stores/builder'

const props = defineProps<{ node: ElementNode }>()

const store = useBuilderStore()
const draft = ref(props.node.name ?? '')
const error = ref<NameError>(null)

watch(
  () => props.node.id,
  () => {
    draft.value = props.node.name ?? ''
    error.value = null
  },
)

function onInput(): void {
  error.value = store.setName(props.node.id, draft.value)
}
</script>

<template>
  <label class="flex flex-col gap-1 text-xs font-medium text-gray-600 dark:text-gray-300">
    {{ t('properties.name.label') }}
    <input
      v-model="draft"
      type="text"
      dir="ltr"
      class="rounded border px-2 py-1.5 font-mono text-sm font-normal text-gray-900 dark:text-gray-100"
      :class="error ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'"
      data-testid="control-name"
      @input="onInput"
    >
    <span
      v-if="error"
      class="font-normal text-red-600 dark:text-red-400"
      data-testid="control-name-error"
    >
      {{ t(`properties.name.${error}`) }}
    </span>
  </label>
</template>
