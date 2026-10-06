<script setup lang="ts">
import { computed, inject, onBeforeUnmount, ref, watch } from 'vue'
import { isVisible } from '../conditions'
import { FORM_CONTEXT, ITEM_SCOPE } from '../context'
import { isRepeater, resolveScoped } from '../repeater'
import { STATIC_TYPES, getCoreElement } from '../elements'
import { MESSAGES, fill } from '../messages'
import { joinPath } from '../runtime'
import type { ColSpan, ElementNode } from '../schema'
import { fieldComponentFor } from './fieldComponents'
import FgButton from './fields/FgButton.vue'
import FgRepeater from './FgRepeater.vue'
import FgStatic from './fields/FgStatic.vue'

const props = defineProps<{
  node: ElementNode
  parentPath: string
  defaultSpan: number
}>()

const ctx = inject(FORM_CONTEXT)
if (!ctx) throw new Error('<FgNode> must be used inside <FormsGenForm>')
// Hoisted function declarations below don't see the narrowing above.
const formCtx = ctx
const messages = computed(() => formCtx.messages?.() ?? MESSAGES.en)

const isStatic = computed(() => STATIC_TYPES.has(props.node.type) && props.node.type !== 'button')

const fieldComponent = computed(() => fieldComponentFor(props.node.type))

const scope = inject(ITEM_SCOPE, null)
const visible = computed(() =>
  isVisible(props.node.conditions, (f) => ctx.getValue(resolveScoped(f, scope))),
)

const path = computed(() =>
  props.node.name ? joinPath(props.parentPath, props.node.name) : props.parentPath,
)

const span = computed<number>(() => (props.node.layout?.colSpan as ColSpan | undefined) ?? props.defaultSpan)
/** style.align and style.className apply to the element's cell. */
const cellClasses = computed(() => {
  const style = props.node.style
  return [style?.align ? `fg-align-${style.align}` : '', style?.className ?? ''].filter(Boolean)
})
// Spans per screen size as custom properties (styles.css picks one per
// breakpoint). All three are set so nested cells never inherit a parent's.
const cellStyle = computed(() => {
  const layout = props.node.layout
  return {
    '--fg-span': String(span.value),
    '--fg-span-sm': String(layout?.colSpanSm ?? 12),
    '--fg-span-lg': String(layout?.colSpanLg ?? span.value),
  }
})

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
    : fill(sectionType.value === 'tab' ? messages.value.tab : messages.value.step, { n: index + 1 })
}

/** Data paths of all value fields inside a section (conditions aside). */
function sectionPaths(section: ElementNode): string[] {
  const paths: string[] = []
  const walk = (nodes: ElementNode[], base: string): void => {
    for (const child of nodes) {
      const core = getCoreElement(child.type)
      if (!core) continue
      if (isRepeater(child)) {
        if (!child.name) continue
        const repeaterPath = joinPath(base, child.name)
        const items = formCtx.getValue(repeaterPath)
        const count = Array.isArray(items) ? items.length : 0
        for (let i = 0; i < count; i++) {
          for (const leaf of child.children ?? []) {
            const leafCore = getCoreElement(leaf.type)
            if (leafCore?.hasValue && leaf.name) paths.push(`${repeaterPath}.${i}.${leaf.name}`)
          }
        }
      } else if (core.isContainer) {
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
  if (ok && activeIndex.value < sections.value.length - 1) goToStep(activeIndex.value + 1)
}

/** Steps: move to a step and announce it to screen readers. */
function goToStep(index: number): void {
  const section = sections.value[index]
  if (!section) return
  activeIndex.value = index
  formCtx.announce?.(
    fill(messages.value.stepProgress, {
      index: index + 1,
      total: sections.value.length,
      label: sectionLabel(section, index),
    }),
  )
}

function buttonText(prop: string, fallback: string): string {
  const value = props.node.props[prop]
  return typeof value === 'string' && value !== '' ? value : fallback
}
const backText = computed(() => buttonText('backText', messages.value.back))
const nextText = computed(() => buttonText('nextText', messages.value.next))

// Steps wizards gate the form's submit button until their last step.
// A hidden wizard (conditions) never holds the button hostage.
if (props.node.type === 'steps') {
  formCtx.registerStepsHost?.(
    props.node.id,
    () => !visible.value || activeIndex.value >= sections.value.length - 1,
  )
  onBeforeUnmount(() => formCtx.unregisterStepsHost?.(props.node.id))
}

// When this wizard owns the submit, it replaces Next on the last step.
const embedsSubmit = computed(
  () =>
    props.node.type === 'steps' &&
    formCtx.submitEmbedHostId?.() === props.node.id &&
    activeIndex.value >= sections.value.length - 1,
)
const embeddedSubmit = computed(
  () => formCtx.submitButtonSpec?.() ?? { text: messages.value.submit, secondary: false },
)
</script>

<template>
  <div
    v-if="visible && (fieldComponent || isStatic || isSectionHost || ['button', 'group', 'columns', 'tab', 'step', 'repeater'].includes(node.type))"
    class="fg-cell"
    :class="cellClasses"
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
    <FgButton
      v-else-if="node.type === 'button'"
      :node="node"
    />
    <FgRepeater
      v-else-if="isRepeater(node)"
      :node="node"
      :path="path"
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
          @click="goToStep(activeIndex - 1)"
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
        <button
          v-if="embedsSubmit"
          type="submit"
          :disabled="formCtx.submitBlocked?.() ?? false"
          :aria-describedby="formCtx.submitHintId?.()"
          class="fg-button"
          :class="embeddedSubmit.secondary ? 'fg-button--secondary' : 'fg-button--primary'"
        >
          {{ embeddedSubmit.text }}
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
