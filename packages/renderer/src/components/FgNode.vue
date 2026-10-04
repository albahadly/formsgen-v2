<script setup lang="ts">
import { computed, inject } from 'vue'
import { isVisible } from '../conditions'
import { FORM_CONTEXT } from '../context'
import { joinPath } from '../runtime'
import type { ColSpan, ElementNode } from '../schema'
import FgCheckbox from './fields/FgCheckbox.vue'
import FgCheckboxGroup from './fields/FgCheckboxGroup.vue'
import FgNumber from './fields/FgNumber.vue'
import FgRadioGroup from './fields/FgRadioGroup.vue'
import FgRange from './fields/FgRange.vue'
import FgSelect from './fields/FgSelect.vue'
import FgStatic from './fields/FgStatic.vue'
import FgText from './fields/FgText.vue'
import FgTextarea from './fields/FgTextarea.vue'

const props = defineProps<{
  node: ElementNode
  parentPath: string
  defaultSpan: number
}>()

const ctx = inject(FORM_CONTEXT)
if (!ctx) throw new Error('<FgNode> must be used inside <FormsGenForm>')

// Internal component map for core field types (ADR-0001).
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

const visible = computed(() => isVisible(props.node.conditions, (f) => ctx.getValue(f)))

const path = computed(() =>
  props.node.name ? joinPath(props.parentPath, props.node.name) : props.parentPath,
)

const span = computed<number>(() => (props.node.layout?.colSpan as ColSpan | undefined) ?? props.defaultSpan)
const cellStyle = computed(() => ({ gridColumn: `span ${span.value} / span ${span.value}` }))

const columnCount = computed(() => Number(props.node.props['count'] ?? 2))
const childSpan = computed(() => Math.max(1, Math.round(12 / columnCount.value)))

const groupLabel = computed(() => {
  const l = props.node.props['label']
  return typeof l === 'string' && l !== '' ? l : null
})
</script>

<template>
  <div
    v-if="visible && (fieldComponent || isStatic || node.type === 'group' || node.type === 'columns')"
    class="fg-cell"
    :style="cellStyle"
  >
    <component
      :is="fieldComponent"
      v-if="fieldComponent"
      :node="node"
      :path="path"
    />
    <FgStatic
      v-else-if="isStatic"
      :node="node"
    />
    <fieldset
      v-else-if="node.type === 'group'"
      class="fg-group"
    >
      <legend
        v-if="groupLabel"
        class="fg-group-label"
      >
        {{ groupLabel }}
      </legend>
      <div class="fg-grid">
        <FgNode
          v-for="child in node.children ?? []"
          :key="child.id"
          :node="child"
          :parent-path="path"
          :default-span="12"
        />
      </div>
    </fieldset>
    <div
      v-else-if="node.type === 'columns'"
      class="fg-grid"
    >
      <FgNode
        v-for="child in node.children ?? []"
        :key="child.id"
        :node="child"
        :parent-path="path"
        :default-span="childSpan"
      />
    </div>
  </div>
</template>
