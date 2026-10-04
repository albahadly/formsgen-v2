<script setup lang="ts">
import {
  FgCheckbox,
  FgSelect,
  FgText,
  FgTextarea,
  joinPath,
  type ElementNode,
} from '@formsgen/renderer'
import { computed } from 'vue'
import { t } from '@/i18n'
import { getElement } from '@/registry'
import { useBuilderStore } from '@/stores/builder'

const props = defineProps<{
  node: ElementNode
  parentPath: string
}>()

const store = useBuilderStore()

const fieldComponents = {
  text: FgText,
  textarea: FgTextarea,
  select: FgSelect,
  checkbox: FgCheckbox,
} as const

const fieldComponent = computed(
  () => fieldComponents[props.node.type as keyof typeof fieldComponents],
)
const definition = computed(() => getElement(props.node.type))
const isContainer = computed(() => definition.value?.isContainer === true)
const selected = computed(() => store.selectedId === props.node.id)
const hasConditions = computed(
  () => (props.node.conditions?.length ?? 0) > 0,
)

const path = computed(() =>
  props.node.name ? joinPath(props.parentPath, props.node.name) : props.parentPath,
)

function onSelect(): void {
  store.select(props.node.id)
}

function onDelete(): void {
  store.removeElement(props.node.id)
}
</script>

<template>
  <div
    class="group relative rounded-md border p-2 transition-colors"
    :class="selected ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-transparent hover:border-indigo-300'"
    :data-testid="`canvas-node-${node.id}`"
    @click.stop="onSelect"
  >
    <div
      class="absolute -top-2.5 end-2 z-10 hidden items-center gap-1 group-hover:flex"
      :class="{ '!flex': selected }"
    >
      <span class="rounded bg-indigo-600 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
        {{ definition?.label ?? node.type }}
      </span>
      <span
        v-if="hasConditions"
        class="rounded bg-amber-500 px-1.5 py-0.5 text-[10px] font-semibold text-white"
      >
        if
      </span>
      <button
        type="button"
        class="rounded bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold text-white hover:bg-red-600"
        :aria-label="t('canvas.delete')"
        :data-testid="`canvas-delete-${node.id}`"
        @click.stop="onDelete"
      >
        ✕
      </button>
    </div>

    <component
      :is="fieldComponent"
      v-if="fieldComponent"
      class="pointer-events-auto"
      :node="node"
      :path="path"
    />

    <div
      v-else-if="isContainer"
      class="rounded border border-dashed border-gray-300 bg-gray-50/60 p-2"
    >
      <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
        {{ definition?.label }}
        <span v-if="node.props.label"> — {{ node.props.label }}</span>
      </p>
      <div
        v-if="(node.children ?? []).length > 0"
        class="flex flex-col gap-2"
        :class="node.type === 'columns' ? 'sm:grid sm:grid-cols-2 sm:gap-2' : ''"
      >
        <BuilderNode
          v-for="child in node.children ?? []"
          :key="child.id"
          :node="child"
          :parent-path="path"
        />
      </div>
      <p
        v-else
        class="py-3 text-center text-xs text-gray-400"
      >
        {{ t('canvas.container.empty') }}
      </p>
    </div>
  </div>
</template>
