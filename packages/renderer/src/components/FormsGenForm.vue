<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, provide, reactive, ref, watch } from 'vue'
import { getValueByPath } from '../conditions'
import { FORM_CONTEXT, type FormContext } from '../context'
import { fill, pluralText, resolveMessages } from '../messages'
import { cloneData, firstFieldError, type UploadStatus } from '../files'
import { pinsLightScheme, themeInlineStyle } from '../theme'
import { analyzeFormulas, calculatedDecimals, calculatedValue, calculationOrder } from '../formula'
import { fieldsByPath, listSeparator, pipeText } from '../pipe'
import { resolveScoped } from '../repeater'
import { collectCalculated, collectVisibleFields, pickVisibleData, scopedLookup, setValueByPath } from '../runtime'
import type { FormSchema } from '../schema'
import { buildDefaultData } from '../tree'
import FgNode from './FgNode.vue'

const props = defineProps<{
  schema: FormSchema
  modelValue?: Record<string, unknown>
  /** Force a screen size's layout (builder device preview); default: the viewport's. */
  viewport?: 'sm' | 'md' | 'lg' | undefined
  /**
   * Upload progress of the submission the host is sending (see
   * sendSubmission): shows a progress bar, then "Upload complete" or the
   * failure; the submit button is disabled while uploading.
   */
  upload?: UploadStatus | null | undefined
}>()

const emit = defineEmits<{
  'update:modelValue': [data: Record<string, unknown>]
  submit: [data: Record<string, unknown>]
}>()

/** meta.theme tokens (validated, with derived values) become --fg-* variables. */
const themeStyle = computed(() => themeInlineStyle(props.schema.meta.theme))
/** Custom background/text colors pin the light scheme (no auto dark mode). */
const pinnedScheme = computed(() => (pinsLightScheme(props.schema.meta.theme) ? 'light' : undefined))

/** Built-in texts (rule defaults, labels, announcements) for meta.locale. */
const messages = computed(() => resolveMessages(props.schema.meta.locale))

function deepMerge(
  base: Record<string, unknown>,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...base }
  for (const [key, value] of Object.entries(patch)) {
    const existing = out[key]
    if (
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value) &&
      typeof existing === 'object' &&
      existing !== null &&
      !Array.isArray(existing)
    ) {
      out[key] = deepMerge(existing as Record<string, unknown>, value as Record<string, unknown>)
    } else {
      out[key] = value
    }
  }
  return out
}

/** Snapshot of the v-model value the form started with (reset target). */
const initialModel = JSON.stringify(props.modelValue ?? {})
const initialData = (): Record<string, unknown> =>
  deepMerge(buildDefaultData(props.schema.tree), JSON.parse(initialModel) as Record<string, unknown>)
const data = reactive<Record<string, unknown>>(initialData())

const errors = reactive<Record<string, string | null>>({})
const touched = reactive<Set<string>>(new Set())
const submitted = ref(false)
const submitAttempts = ref(0)

const lookup = (field: string): unknown => getValueByPath(data, field)

function validateField(path: string): void {
  const field = collectVisibleFields(props.schema.tree, data).find((f) => f.path === path)
  if (!field) {
    errors[path] = null
    return
  }
  errors[path] = firstFieldError(field.node, lookup(path), scopedLookup(data, field.scope), messages.value)
}

/** Validates every visible field; clears stale errors; true when clean. */
function validateAll(): boolean {
  for (const key of Object.keys(errors)) errors[key] = null
  let ok = true
  for (const field of collectVisibleFields(props.schema.tree, data)) {
    const error = firstFieldError(field.node, lookup(field.path), scopedLookup(data, field.scope), messages.value)
    errors[field.path] = error
    if (error) ok = false
  }
  return ok
}

// Calculated fields: recomputed whenever an answer changes, in dependency
// order (a field after those it reads); writing an unchanged value is skipped.
const formulas = computed(() => analyzeFormulas(props.schema.tree))
const calcOrder = computed(() => calculationOrder(props.schema.tree))
function applyCalculations(): void {
  const instances = collectCalculated(props.schema.tree, data)
  for (const node of calcOrder.value) {
    const tree = formulas.value.get(node.id)?.tree ?? null
    for (const field of instances.filter((f) => f.node === node)) {
      const next = tree
        ? calculatedValue(
            tree,
            {
              value: (path) => getValueByPath(data, resolveScoped(path, field.scope)),
              items: (path) => {
                const items = getValueByPath(data, path)
                return Array.isArray(items) ? (items as Record<string, unknown>[]) : []
              },
            },
            calculatedDecimals(node),
          )
        : null
      if (getValueByPath(data, field.path) !== next) setValueByPath(data, field.path, next)
    }
  }
}
applyCalculations()

watch(
  data,
  () => {
    applyCalculations()
    emit('update:modelValue', cloneData(data))
    // Live re-validation for fields the user already interacted with.
    for (const path of touched) validateField(path)
    if (submitted.value) validateAll()
  },
  { deep: true },
)

// A field's error appearing on blur reflows the form. If that happens while
// a pointer is held (between pointerdown and pointerup), the release lands
// on a moved target and the click is lost — so blur validation waits for
// the press to end, then runs after the click has been dispatched.
let pressing = false
const deferredTouches = new Set<string>()
function flushDeferredTouches(): void {
  const paths = [...deferredTouches]
  deferredTouches.clear()
  for (const path of paths) context.touch(path)
}
function onPointerDown(): void {
  flushDeferredTouches()
  pressing = true
}
function onPointerEnd(): void {
  if (!pressing) return
  pressing = false
  setTimeout(flushDeferredTouches, 0)
}
onMounted(() => {
  window.addEventListener('pointerup', onPointerEnd)
  window.addEventListener('pointercancel', onPointerEnd)
})
onBeforeUnmount(() => {
  window.removeEventListener('pointerup', onPointerEnd)
  window.removeEventListener('pointercancel', onPointerEnd)
})

// Steps wizards register an "at end?" probe; the submit button hides
// until every registered wizard sits on its last step (configurable).
const stepsHosts = reactive(new Map<string, () => boolean>())

const context: FormContext = {
  getValue: (path) => getValueByPath(data, path),
  setValue: (path, value) => setValueByPath(data, path, value),
  getError: (path) => (touched.has(path) || submitted.value ? (errors[path] ?? null) : null),
  touch: (path) => {
    if (pressing) {
      deferredTouches.add(path)
      return
    }
    touched.add(path)
    validateField(path)
  },
  isSubmitted: () => submitted.value,
  submitCount: () => submitAttempts.value,
  registerStepsHost: (id, atEnd) => {
    stepsHosts.set(id, atEnd)
  },
  unregisterStepsHost: (id) => {
    stepsHosts.delete(id)
  },
  submitEmbedHostId: () => embeddedHostId.value,
  messages: () => messages.value,
  locale: () => props.schema.meta.locale,
  fieldSize: () => props.schema.meta.fieldSize,
  floatingLabels: () => props.schema.meta.floatingLabels === true,
  submitButtonSpec: () => ({
    text: submitText.value,
    secondary: submitCfg.value?.variant === 'secondary',
  }),
}
provide(FORM_CONTEXT, context)

// ---- submit button configuration (meta.submitButton) ----
const submitCfg = computed(() => props.schema.meta.submitButton)
const submitText = computed(() => {
  const text = submitCfg.value?.text
  return typeof text === 'string' && text !== '' ? text : messages.value.submit
})
const submitClass = computed(() =>
  submitCfg.value?.variant === 'secondary'
    ? 'fg-button fg-button--secondary'
    : 'fg-button fg-button--primary',
)
const actionsStyle = computed<Record<string, string>>(() => {
  const align = submitCfg.value?.align
  return align && align !== 'start' ? { textAlign: align } : {}
})
const submitStyle = computed<Record<string, string>>(() =>
  submitCfg.value?.fullWidth ? { width: '100%' } : {},
)
// With exactly one gating wizard, the submit button moves INTO its step
// actions row (same slot as Next); the bottom button then never renders.
const embeddedHostId = computed(() => {
  if (submitCfg.value?.onLastStepOnly === false) return null
  const ids = [...stepsHosts.keys()]
  return ids.length === 1 ? (ids[0] ?? null) : null
})
const submitVisible = computed(() => {
  if (submitCfg.value?.onLastStepOnly === false) return true
  if (embeddedHostId.value) return false
  for (const atEnd of stepsHosts.values()) {
    if (!atEnd()) return false
  }
  return true
})

// Polite live region. Cleared first so repeating the same text (two failed
// submits in a row) is still re-announced.
const announcement = ref('')
function announce(message: string): void {
  announcement.value = ''
  void nextTick(() => {
    announcement.value = message
  })
}
context.announce = announce

// Answers inside text ({field}, {field|fallback}).
const pipeFields = computed(() => fieldsByPath(props.schema.tree))
context.pipe = (text, scope) =>
  pipeText(
    text,
    pipeFields.value,
    scope?.template ?? '',
    (path) => getValueByPath(data, resolveScoped(path, scope)),
    messages.value,
    listSeparator(props.schema.meta.locale),
  )

/**
 * A repeater item was removed: later items move up one index, so their
 * touched state and errors follow them (the removed item's are dropped).
 */
/** Re-keys item state when items move or go (old index → new, null = gone). */
function remapItems(repeaterPath: string, to: (index: number) => number | null): void {
  const pattern = new RegExp(`^${repeaterPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\.(\\d+)(\\..*)$`)
  const moved = (key: string): string | null => {
    const match = pattern.exec(key)
    if (!match) return key
    const next = to(Number(match[1]))
    return next === null ? null : `${repeaterPath}.${next}${match[2]}`
  }
  const nextTouched = [...touched].map(moved).filter((k): k is string => k !== null)
  touched.clear()
  for (const key of nextTouched) touched.add(key)
  const nextErrors: Record<string, string | null> = {}
  for (const [key, message] of Object.entries(errors)) {
    const target = moved(key)
    if (target !== null) nextErrors[target] = message
  }
  for (const key of Object.keys(errors)) delete errors[key]
  Object.assign(errors, nextErrors)
}
context.shiftItems = (repeaterPath, removed) =>
  remapItems(repeaterPath, (i) => (i === removed ? null : i > removed ? i - 1 : i))
context.swapItems = (repeaterPath, a, b) => remapItems(repeaterPath, (i) => (i === a ? b : i === b ? a : i))

/** Reset buttons: back to the initial values, no errors shown. */
context.reset = () => {
  const initial = initialData()
  for (const key of Object.keys(data)) delete data[key]
  Object.assign(data, initial)
  // After the data watcher has run (it re-validates touched fields).
  void nextTick(() => {
    touched.clear()
    submitted.value = false
    for (const key of Object.keys(errors)) errors[key] = null
    announce(messages.value.formReset)
  })
}

const uploadPercent = computed(() => Math.round(Math.min(1, Math.max(0, props.upload?.progress ?? 0)) * 100))
const uploading = computed(() => props.upload?.state === 'uploading')
watch(
  () => props.upload?.state,
  (state) => {
    if (state === 'uploading') announce(messages.value.uploadStarted)
    else if (state === 'done') announce(messages.value.submitted)
    else if (state === 'failed') announce(messages.value.uploadFailed)
  },
)

function onSubmit(): void {
  if (uploading.value) return
  submitted.value = true
  const ok = validateAll()
  submitAttempts.value++
  if (ok) {
    announce(messages.value.submitted)
    emit('submit', pickVisibleData(props.schema.tree, data))
  } else {
    announce(
      pluralText(messages.value, messages.value.errors, Object.values(errors).filter(Boolean).length),
    )
  }
}
</script>

<template>
  <form
    class="fg-form"
    :dir="schema.meta.dir"
    :style="themeStyle"
    :data-fg-theme="pinnedScheme"
    :data-fg-viewport="viewport"
    novalidate
    @submit.prevent="onSubmit"
    @pointerdown.capture="onPointerDown"
  >
    <div class="fg-grid">
      <FgNode
        v-for="node in schema.tree"
        :key="node.id"
        :node="node"
        parent-path=""
        :default-span="12"
      />
    </div>
    <div
      v-if="upload"
      class="fg-upload"
      data-fg-upload
    >
      <template v-if="upload.state !== 'failed'">
        <div
          class="fg-progress"
          role="progressbar"
          :aria-label="messages.uploadProgress"
          aria-valuemin="0"
          aria-valuemax="100"
          :aria-valuenow="uploadPercent"
        >
          <div
            class="fg-progress-bar"
            :style="{ inlineSize: `${uploadPercent}%` }"
          />
        </div>
        <p class="fg-progress-text">
          {{ upload.state === 'done' ? messages.uploadDone : fill(messages.uploading, { n: uploadPercent }) }}
        </p>
      </template>
      <p
        v-else
        class="fg-error"
      >
        {{ messages.uploadFailed }}
      </p>
    </div>
    <div
      class="fg-sr-only"
      role="status"
      aria-live="polite"
      aria-atomic="true"
      data-fg-live
    >
      {{ announcement }}
    </div>
    <div
      class="fg-actions"
      :style="actionsStyle"
    >
      <slot name="actions">
        <button
          v-if="submitVisible"
          :class="submitClass"
          :style="submitStyle"
          type="submit"
          :disabled="uploading"
        >
          {{ submitText }}
        </button>
      </slot>
    </div>
  </form>
</template>
