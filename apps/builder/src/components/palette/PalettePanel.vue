<script setup lang="ts">
import { computed, ref } from 'vue'
import draggable from 'vuedraggable'
import SvgIcon from '@/components/ui/SvgIcon.vue'
import { t, tOr } from '@/i18n'
import { listElements } from '@/registry'
import { createNode } from '@/registry/factory'
import type { ElementCategory, ElementDefinition } from '@/registry/types'
import { useBuilderStore } from '@/stores/builder'

const store = useBuilderStore()
const search = ref('')
const category = ref<ElementCategory>('fields')

const categories: ElementCategory[] = ['fields', 'static', 'structure']

const items = computed<ElementDefinition[]>(() => {
  const base =
    search.value.trim() === ''
      ? listElements(category.value)
      : listElements().filter((d) => {
          const q = search.value.toLowerCase()
          return (
            d.label.toLowerCase().includes(q) ||
            d.description.toLowerCase().includes(q) ||
            tOr(`element.${d.type}.label`, d.label).toLowerCase().includes(q)
          )
        })
  return base
})

function add(type: string): void {
  store.addElement(type)
}

/** Drag-clone: dropping a palette item materializes a fresh node. */
function clone(def: ElementDefinition) {
  return createNode(def.type, store.takenNames)
}
</script>

<template>
  <div
    class="flex h-full flex-col gap-3"
    data-testid="panel-palette"
  >
    <h2 class="text-sm font-semibold text-gray-700">
      {{ t('palette.title') }}
    </h2>
    <input
      v-model="search"
      type="search"
      class="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
      :placeholder="t('palette.search')"
    >
    <div
      v-if="!search.trim()"
      class="flex gap-1"
      role="tablist"
    >
      <button
        v-for="c in categories"
        :key="c"
        type="button"
        role="tab"
        class="rounded px-2 py-1 text-xs font-medium"
        :class="c === category ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
        :aria-selected="c === category"
        @click="category = c"
      >
        {{ t(`palette.category.${c}`) }}
      </button>
    </div>
    <draggable
      :list="items"
      item-key="type"
      class="flex flex-1 flex-col gap-1.5 overflow-y-auto"
      tag="ul"
      :group="{ name: 'canvas', pull: 'clone', put: false }"
      :sort="false"
      :clone="clone"
    >
      <template #item="{ element: def }">
        <li>
          <button
            type="button"
            class="flex w-full cursor-grab items-center gap-2 rounded-md border border-gray-200 bg-white px-2 py-2 text-start hover:border-indigo-400 hover:bg-indigo-50"
            :data-testid="`palette-item-${def.type}`"
            :title="def.description"
            @click="add(def.type)"
          >
            <SvgIcon
              class="text-gray-500"
              :svg="def.icon"
            />
            <span class="min-w-0">
              <span class="block truncate text-sm font-medium text-gray-800">{{ tOr(`element.${def.type}.label`, def.label) }}</span>
              <span class="block truncate text-xs text-gray-500">{{ tOr(`element.${def.type}.description`, def.description) }}</span>
            </span>
          </button>
        </li>
      </template>
      <template #footer>
        <li
          v-if="items.length === 0"
          class="px-2 py-4 text-center text-xs text-gray-400"
        >
          {{ t('palette.empty') }}
        </li>
      </template>
    </draggable>
  </div>
</template>
