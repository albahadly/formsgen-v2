<script setup lang="ts">
import type { ElementNode } from '@formsgen/renderer'
import { computed } from 'vue'
import { t } from '@/i18n'
import { getElement } from '@/registry'
import { useBuilderStore } from '@/stores/builder'

interface Row {
  id: string
  depth: number
  label: string
  name: string | undefined
}

const store = useBuilderStore()

const rows = computed<Row[]>(() => {
  const out: Row[] = []
  const walk = (nodes: ElementNode[], depth: number): void => {
    for (const node of nodes) {
      out.push({
        id: node.id,
        depth,
        label: getElement(node.type)?.label ?? node.type,
        name: node.name,
      })
      if (node.children) walk(node.children, depth + 1)
    }
  }
  walk(store.schema.tree, 0)
  return out
})
</script>

<template>
  <div
    class="flex h-full flex-col gap-2"
    data-testid="panel-tree"
  >
    <h2 class="text-sm font-semibold text-gray-700">
      {{ t('tree.title') }}
    </h2>
    <ul class="flex flex-1 flex-col overflow-y-auto text-sm">
      <li
        v-for="row in rows"
        :key="row.id"
      >
        <button
          type="button"
          class="flex w-full items-center gap-1.5 rounded px-2 py-1 text-start hover:bg-gray-100"
          :class="{ 'bg-indigo-50 text-indigo-700': store.selectedId === row.id }"
          :style="{ paddingInlineStart: `${0.5 + row.depth * 0.75}rem` }"
          :data-testid="`tree-row-${row.id}`"
          @click="store.select(row.id)"
        >
          <span class="truncate text-xs font-medium">{{ row.label }}</span>
          <code
            v-if="row.name"
            class="truncate text-[10px] text-gray-400"
          >{{ row.name }}</code>
        </button>
      </li>
      <li
        v-if="rows.length === 0"
        class="px-2 py-4 text-center text-xs text-gray-400"
      >
        {{ t('tree.empty') }}
      </li>
    </ul>
  </div>
</template>
