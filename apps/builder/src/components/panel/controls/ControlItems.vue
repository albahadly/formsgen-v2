<script setup lang="ts">
import type { ElementNode } from '@formsgen/renderer'
import { computed } from 'vue'
import { t } from '@/i18n'
import { useBuilderStore } from '@/stores/builder'

interface Item {
  value: string
  label: string
}

const props = defineProps<{
  node: ElementNode
  prop: string
  label: string
}>()

const store = useBuilderStore()

const items = computed<Item[]>(() => {
  const raw = props.node.props[props.prop]
  return Array.isArray(raw) ? (raw as Item[]) : []
})

function write(next: Item[]): void {
  store.updateProps(props.node.id, { [props.prop]: next })
}

function updateItem(index: number, key: keyof Item, value: string): void {
  const next = items.value.map((item, i) => (i === index ? { ...item, [key]: value } : item))
  write(next)
}

function addItem(): void {
  const n = items.value.length + 1
  write([...items.value, { value: `option_${n}`, label: `Option ${n}` }])
}

function removeItem(index: number): void {
  write(items.value.filter((_, i) => i !== index))
}
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <span class="text-xs font-medium text-gray-600">{{ label }}</span>
    <div
      v-for="(item, index) in items"
      :key="index"
      class="flex items-center gap-1.5"
    >
      <input
        type="text"
        class="w-1/3 rounded border border-gray-300 px-2 py-1 text-xs"
        :value="item.value"
        :placeholder="t('properties.items.value')"
        :data-testid="`items-value-${index}`"
        @input="updateItem(index, 'value', ($event.target as HTMLInputElement).value)"
      >
      <input
        type="text"
        class="flex-1 rounded border border-gray-300 px-2 py-1 text-xs"
        :value="item.label"
        :placeholder="t('properties.items.label')"
        :data-testid="`items-label-${index}`"
        @input="updateItem(index, 'label', ($event.target as HTMLInputElement).value)"
      >
      <button
        type="button"
        class="rounded px-1.5 py-1 text-xs text-red-500 hover:bg-red-50"
        :aria-label="t('properties.items.remove')"
        @click="removeItem(index)"
      >
        ✕
      </button>
    </div>
    <button
      type="button"
      class="self-start rounded border border-dashed border-gray-300 px-2 py-1 text-xs text-gray-500 hover:border-indigo-400 hover:text-indigo-600"
      data-testid="items-add"
      @click="addItem"
    >
      + {{ t('properties.items.add') }}
    </button>
  </div>
</template>
