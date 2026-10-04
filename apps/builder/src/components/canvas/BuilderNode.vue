<script setup lang="ts">
import {
  FgCheckbox,
  FgCheckboxGroup,
  FgNumber,
  FgRadioGroup,
  FgRange,
  FgSelect,
  FgStatic,
  FgText,
  FgTextarea,
  fill,
  joinPath,
  resolveMessages,
  type ElementNode,
} from '@formsgen/renderer'
import { computed, ref, watch } from 'vue'
import draggable from 'vuedraggable'
import { t, tOr } from '@/i18n'
import { getElement } from '@/registry'
import { useBuilderStore } from '@/stores/builder'
import { useDropList } from './useDropList'

const props = defineProps<{
  node: ElementNode
  parentPath: string
}>()

const store = useBuilderStore()
// Fallback section names are form content: they follow the form's locale.
const formMessages = computed(() => resolveMessages(store.schema.meta.locale))

const fieldComponents = {
  text: FgText,
  email: FgText,
  password: FgText,
  url: FgText,
  phone: FgText,
  date: FgText,
  time: FgText,
  textarea: FgTextarea,
  number: FgNumber,
  select: FgSelect,
  radiogroup: FgRadioGroup,
  checkbox: FgCheckbox,
  checkboxgroup: FgCheckboxGroup,
  range: FgRange,
} as const

const staticTypes = new Set(['heading', 'paragraph', 'divider'])
const isStatic = computed(() => staticTypes.has(props.node.type))

const fieldComponent = computed(
  () => fieldComponents[props.node.type as keyof typeof fieldComponents],
)
const definition = computed(() => getElement(props.node.type))
const isContainer = computed(() => definition.value?.isContainer === true)
const selected = computed(() => store.selectedId === props.node.id)
const hasConditions = computed(() => (props.node.conditions?.length ?? 0) > 0)

const path = computed(() =>
  props.node.name ? joinPath(props.parentPath, props.node.name) : props.parentPath,
)

const columnsClass = computed(() => {
  if (props.node.type !== 'columns') return ''
  const count = Number(props.node.props['count'] ?? 2)
  return { 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3', 4: 'sm:grid-cols-4' }[count] ?? 'sm:grid-cols-2'
})

const { list, onMove, onAdd } = useDropList(() => props.node.id)

// ---- tabs / steps section hosts ----

const isSectionHost = computed(() => props.node.type === 'tabs' || props.node.type === 'steps')
const sectionKind = computed(() => (props.node.type === 'tabs' ? 'tab' : 'step'))
const sections = computed(() =>
  (props.node.children ?? []).filter((c) => c.type === sectionKind.value),
)
const activeIndex = ref(0)
watch(
  () => sections.value.length,
  (len) => {
    if (activeIndex.value >= len) activeIndex.value = Math.max(0, len - 1)
  },
)
// Selecting a section from the outline reveals it on the canvas.
watch(
  () => store.selectedId,
  (id) => {
    const index = sections.value.findIndex((s) => s.id === id)
    if (index !== -1) activeIndex.value = index
  },
)
const activeSection = computed(() => sections.value[activeIndex.value])

const sectionDrop = useDropList(() => activeSection.value?.id ?? null)

function sectionLabel(section: ElementNode, index: number): string {
  const l = section.props['label']
  return typeof l === 'string' && l !== ''
    ? l
    : fill(sectionKind.value === 'tab' ? formMessages.value.tab : formMessages.value.step, { n: index + 1 })
}

function selectSection(section: ElementNode, index: number): void {
  activeIndex.value = index
  store.select(section.id)
}

function removeSection(section: ElementNode): void {
  store.removeElement(section.id)
}

function addSection(): void {
  store.addSection(props.node.id)
  activeIndex.value = sections.value.length - 1
}

function onSelect(): void {
  store.select(props.node.id)
}

function onDelete(): void {
  store.removeElement(props.node.id)
}

function onDuplicate(): void {
  store.duplicateElement(props.node.id)
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
      <span class="cursor-grab rounded bg-indigo-600 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
        {{ tOr(`element.${node.type}.label`, definition?.label ?? node.type) }}
      </span>
      <span
        v-if="hasConditions"
        class="rounded bg-amber-500 px-1.5 py-0.5 text-[10px] font-semibold text-white"
        :title="t('canvas.conditionalBadge.title')"
      >
        {{ t('canvas.conditionalBadge') }}
      </span>
      <button
        type="button"
        class="rounded bg-gray-500 px-1.5 py-0.5 text-[10px] font-semibold text-white hover:bg-gray-600"
        :aria-label="t('canvas.duplicate')"
        :data-testid="`canvas-duplicate-${node.id}`"
        @click.stop="onDuplicate"
      >
        ⧉
      </button>
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

    <FgStatic
      v-else-if="isStatic"
      :node="node"
    />

    <div
      v-else-if="isSectionHost"
      class="rounded border border-dashed border-gray-300 bg-gray-50/60 p-2"
    >
      <div class="mb-2 flex flex-wrap items-center gap-1">
        <button
          v-for="(section, index) in sections"
          :key="section.id"
          type="button"
          class="group/tab flex items-center gap-1 rounded-t border-b-2 px-2.5 py-1 text-xs font-medium"
          :class="index === activeIndex
            ? 'border-indigo-500 bg-white text-indigo-700'
            : 'border-transparent text-gray-500 hover:bg-gray-100'"
          :data-testid="`section-tab-${section.id}`"
          @click.stop="selectSection(section, index)"
        >
          {{ sectionLabel(section, index) }}
          <span
            v-if="sections.length > 1"
            class="hidden rounded px-0.5 text-[10px] text-red-400 hover:bg-red-50 hover:text-red-600 group-hover/tab:inline"
            role="button"
            :aria-label="t('canvas.section.remove')"
            :data-testid="`section-remove-${section.id}`"
            @click.stop="removeSection(section)"
          >✕</span>
        </button>
        <button
          type="button"
          class="rounded px-2 py-1 text-xs text-gray-400 hover:bg-gray-100 hover:text-indigo-600"
          :data-testid="`section-add-${node.id}`"
          @click.stop="addSection"
        >
          + {{ sectionKind === 'tab' ? t('canvas.section.addTab') : t('canvas.section.addStep') }}
        </button>
      </div>
      <draggable
        v-if="activeSection"
        v-model="sectionDrop.list.value"
        item-key="id"
        group="canvas"
        class="flex min-h-12 flex-col gap-2"
        :data-parent-id="activeSection.id"
        ghost-class="opacity-40"
        :move="sectionDrop.onMove"
        @add="sectionDrop.onAdd"
      >
        <template #item="{ element }">
          <BuilderNode
            :node="element"
            :parent-path="path"
          />
        </template>
        <template #footer>
          <p
            v-if="(activeSection.children ?? []).length === 0"
            class="pointer-events-none py-3 text-center text-xs text-gray-400"
          >
            {{ t('canvas.container.empty') }}
          </p>
        </template>
      </draggable>
    </div>

    <div
      v-else-if="isContainer"
      class="rounded border border-dashed border-gray-300 bg-gray-50/60 p-2"
    >
      <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
        {{ tOr(`element.${node.type}.label`, definition?.label ?? node.type) }}
        <span v-if="node.props.label"> — {{ node.props.label }}</span>
      </p>
      <draggable
        v-model="list"
        item-key="id"
        group="canvas"
        class="flex min-h-12 flex-col gap-2"
        :class="columnsClass ? `sm:grid ${columnsClass}` : ''"
        :data-parent-id="node.id"
        ghost-class="opacity-40"
        :move="onMove"
        @add="onAdd"
      >
        <template #item="{ element }">
          <BuilderNode
            :node="element"
            :parent-path="path"
          />
        </template>
        <template #footer>
          <p
            v-if="(node.children ?? []).length === 0"
            class="pointer-events-none py-3 text-center text-xs text-gray-400"
          >
            {{ t('canvas.container.empty') }}
          </p>
        </template>
      </draggable>
    </div>
  </div>
</template>
