<script setup lang="ts">
import { computed, inject, ref, watch } from 'vue'
import { isVisible } from '../conditions'
import { FORM_CONTEXT } from '../context'
import { getCoreElement } from '../elements'
import { joinPath } from '../runtime'
import type { ColSpan, ElementNode } from '../schema'
import FgCheckbox from './fields/FgCheckbox.vue'
import FgCheckboxGroup from './fields/FgCheckboxGroup.vue'
import FgMultiSelect from './fields/FgMultiSelect.vue'
import FgNumber from './fields/FgNumber.vue'
import FgRadioGroup from './fields/FgRadioGroup.vue'
import FgRange from './fields/FgRange.vue'
import FgSelect from './fields/FgSelect.vue'
import FgStatic from './fields/FgStatic.vue'
import FgTags from './fields/FgTags.vue'
import FgText from './fields/FgText.vue'
import FgTextarea from './fields/FgTextarea.vue'

const props = defineProps<{
  node: ElementNode
  parentPath: string
  defaultSpan: number
}>()

const ctx = inject(FORM_CONTEXT)
if (!ctx) throw new Error('<FgNode> must be used inside <FormsGenForm>')
// Hoisted function declarations below don't see the narrowing above.
const formCtx = ctx

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
  multiselect: FgMultiSelect,
  tags: FgTags,
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

// ---- tabs / steps sections ----

const isSectionHost = computed(() => props.node.type === 'tabs' || props.node.type === 'steps')
const sectionType = computed(() => (props.node.type === 'tabs' ? 'tab' : 'step'))
const sections = computed(() =>
  (props.node.children ?? []).filter((c) => c.type === sectionType.value),
)
const activeIndex = ref(0)
watch(
  () => sections.value.length,
  (len) => {
    if (activeIndex.value >= len) activeIndex.value = Math.max(0, len - 1)
  },
)
const activeSection = computed(() => sections.value[activeIndex.value])

function sectionLabel(section: ElementNode, index: number): string {
  const l = section.props['label']
  return typeof l === 'string' && l !== ''
    ? l
    : `${sectionType.value === 'tab' ? 'Tab' : 'Step'} ${index + 1}`
}

/** Data paths of all value fields inside a section (conditions aside). */
function sectionPaths(section: ElementNode): string[] {
  const paths: string[] = []
  const walk = (nodes: ElementNode[], base: string): void => {
    for (const child of nodes) {
      const core = getCoreElement(child.type)
      if (!core) continue
      if (core.isContainer) {
        walk(child.children ?? [], child.name ? joinPath(base, child.name) : base)
      } else if (core.hasValue && child.name) {
        paths.push(joinPath(base, child.name))
      }
    }
  }
  walk(section.children ?? [], path.value)
  return paths
}

function sectionHasError(section: ElementNode): boolean {
  return sectionPaths(section).some((p) => formCtx.getError(p) !== null)
}

// After a submit attempt, reveal the first section that holds an error
// (only when the currently active one is clean).
watch(
  () => formCtx.submitCount(),
  (count) => {
    if (count === 0 || !isSectionHost.value) return
    const current = activeSection.value
    if (current && sectionHasError(current)) return
    const firstErrored = sections.value.findIndex((s) => sectionHasError(s))
    if (firstErrored !== -1) activeIndex.value = firstErrored
  },
)

/** Steps: validate the current step's fields; advance only when clean. */
function nextStep(): void {
  const current = activeSection.value
  if (!current) return
  let ok = true
  for (const fieldPath of sectionPaths(current)) {
    formCtx.touch(fieldPath)
    if (formCtx.getError(fieldPath) !== null) ok = false
  }
  if (ok && activeIndex.value < sections.value.length - 1) activeIndex.value++
}

function buttonText(prop: string, fallback: string): string {
  const value = props.node.props[prop]
  return typeof value === 'string' && value !== '' ? value : fallback
}
const backText = computed(() => buttonText('backText', 'Back'))
const nextText = computed(() => buttonText('nextText', 'Next'))
</script>

<template>
  <div
    v-if="visible && (fieldComponent || isStatic || isSectionHost || ['group', 'columns', 'tab', 'step'].includes(node.type))"
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
    <div
      v-else-if="node.type === 'tabs'"
      class="fg-tabs"
    >
      <div
        class="fg-tab-list"
        role="tablist"
      >
        <button
          v-for="(section, index) in sections"
          :key="section.id"
          type="button"
          role="tab"
          class="fg-tab-button"
          :class="{
            'fg-tab-button--active': index === activeIndex,
            'fg-tab-button--error': sectionHasError(section),
          }"
          :aria-selected="index === activeIndex"
          @click="activeIndex = index"
        >
          {{ sectionLabel(section, index) }}
          <span
            v-if="sectionHasError(section)"
            class="fg-tab-error-dot"
            aria-hidden="true"
          />
        </button>
      </div>
      <div
        v-if="activeSection"
        class="fg-grid"
        role="tabpanel"
      >
        <FgNode
          v-for="child in activeSection.children ?? []"
          :key="child.id"
          :node="child"
          :parent-path="path"
          :default-span="12"
        />
      </div>
    </div>
    <div
      v-else-if="node.type === 'steps'"
      class="fg-steps"
    >
      <ol class="fg-step-list">
        <li
          v-for="(section, index) in sections"
          :key="section.id"
          class="fg-step-item"
          :class="{
            'fg-step-item--active': index === activeIndex,
            'fg-step-item--done': index < activeIndex,
          }"
          :aria-current="index === activeIndex ? 'step' : undefined"
        >
          <span class="fg-step-dot">{{ index + 1 }}</span>
          <span>{{ sectionLabel(section, index) }}</span>
        </li>
      </ol>
      <div
        v-if="activeSection"
        class="fg-grid"
      >
        <FgNode
          v-for="child in activeSection.children ?? []"
          :key="child.id"
          :node="child"
          :parent-path="path"
          :default-span="12"
        />
      </div>
      <div class="fg-step-actions">
        <button
          v-if="activeIndex > 0"
          type="button"
          class="fg-button fg-button--secondary"
          @click="activeIndex--"
        >
          {{ backText }}
        </button>
        <button
          v-if="activeIndex < sections.length - 1"
          type="button"
          class="fg-button fg-button--primary"
          @click="nextStep"
        >
          {{ nextText }}
        </button>
      </div>
    </div>
    <div
      v-else-if="node.type === 'tab' || node.type === 'step'"
      class="fg-grid"
    >
      <!-- A stray section outside its host renders transparently. -->
      <FgNode
        v-for="child in node.children ?? []"
        :key="child.id"
        :node="child"
        :parent-path="path"
        :default-span="12"
      />
    </div>
  </div>
</template>
