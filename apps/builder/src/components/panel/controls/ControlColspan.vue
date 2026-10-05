<script setup lang="ts">
// Column span per screen size: phones (<768px, default full width),
// tablets (the base span) and desktops (≥1024px, default = tablets).
import type { ColSpan, ElementNode } from '@formsgen/renderer'
import { t } from '@/i18n'
import { useBuilderStore } from '@/stores/builder'

const props = defineProps<{ node: ElementNode }>()

const store = useBuilderStore()
const spans: ColSpan[] = [1, 2, 3, 4, 6, 12]
const sizes = [
  { key: 'colSpanSm', label: 'properties.colspan.sm', testid: 'control-colspan-sm' },
  { key: 'colSpan', label: 'properties.colspan.md', testid: 'control-colspan' },
  { key: 'colSpanLg', label: 'properties.colspan.lg', testid: 'control-colspan-lg' },
] as const

function current(key: (typeof sizes)[number]['key']): string {
  const value = props.node.layout?.[key]
  return value !== undefined ? String(value) : ''
}

function set(key: (typeof sizes)[number]['key'], v: string): void {
  store.setSpan(props.node.id, key, v === '' ? undefined : (Number(v) as ColSpan))
}
</script>

<template>
  <fieldset class="flex flex-col gap-1">
    <legend class="mb-1 text-xs font-medium text-gray-600">
      {{ t('properties.colspan.label') }}
    </legend>
    <div class="grid grid-cols-3 gap-2">
      <label
        v-for="size in sizes"
        :key="size.key"
        class="flex flex-col gap-1 text-[11px] font-medium text-gray-500"
      >
        {{ t(size.label) }}
        <select
          :value="current(size.key)"
          class="rounded border border-gray-300 px-1.5 py-1.5 text-sm font-normal text-gray-900"
          :data-testid="size.testid"
          @change="set(size.key, ($event.target as HTMLSelectElement).value)"
        >
          <option value="">
            {{ t('properties.colspan.auto') }}
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
    </div>
  </fieldset>
</template>
