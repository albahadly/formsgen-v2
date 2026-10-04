<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, provide, reactive, ref, watch } from 'vue'
import { getValueByPath } from '../conditions'
import { FORM_CONTEXT, type FormContext } from '../context'
import { pluralText, resolveMessages } from '../messages'
import { evaluateRules } from '../rules'
import { pinsLightScheme, themeInlineStyle } from '../theme'
import { collectVisibleFields, pickVisibleData, setValueByPath } from '../runtime'
import type { FormSchema } from '../schema'
import { buildDefaultData } from '../tree'
import FgNode from './FgNode.vue'

const props = defineProps<{
  schema: FormSchema
  modelValue?: Record<string, unknown>
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

const data = reactive<Record<string, unknown>>(
  deepMerge(buildDefaultData(props.schema.tree), props.modelValue ?? {}),
)

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
  const violations = evaluateRules(field.node.validation, lookup(path), lookup, messages.value)
  errors[path] = violations[0]?.message ?? null
}

/** Validates every visible field; clears stale errors; true when clean. */
function validateAll(): boolean {
  for (const key of Object.keys(errors)) errors[key] = null
  let ok = true
  for (const field of collectVisibleFields(props.schema.tree, data)) {
    const violations = evaluateRules(
      field.node.validation,
      lookup(field.path),
      lookup,
      messages.value,
    )
    errors[field.path] = violations[0]?.message ?? null
    if (violations.length > 0) ok = false
  }
  return ok
}

watch(
  data,
  () => {
    emit('update:modelValue', JSON.parse(JSON.stringify(data)) as Record<string, unknown>)
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

function onSubmit(): void {
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
        >
          {{ submitText }}
        </button>
      </slot>
    </div>
  </form>
</template>
