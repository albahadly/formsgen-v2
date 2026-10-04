<script setup lang="ts">
import type { ColSpan, ElementNode } from '@formsgen/renderer'
import { computed } from 'vue'
import { t } from '@/i18n'
import { useBuilderStore } from '@/stores/builder'

const props = defineProps<{ node: ElementNode }>()

const store = useBuilderStore()
const spans: ColSpan[] = [1, 2, 3, 4, 6, 12]

const value = computed({
  get: () => (props.node.layout?.colSpan !== undefined ? String(props.node.layout.colSpan) : ''),
  set: (v: string) => {
    store.setColSpan(props.node.id, v === '' ? undefined : (Number(v) as ColSpan))
  },
})
</script>

<template>
  <label class="flex flex-col gap-1 text-xs font-medium text-gray-600">
    {{ t('properties.colspan.label') }}
    <select
      v-model="value"
      class="rounded border border-gray-300 px-2 py-1.5 text-sm font-normal text-gray-900"
      data-testid="control-colspan"
    >
      <option value="">
        Auto
      </option>
      <option
        v-for="span in spans"
        :key="span"
        :value="String(span)"
      >
        {{ span }} / 12
      </option>
    </select>
  </label>
</template>
