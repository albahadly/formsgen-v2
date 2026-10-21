<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, provide, reactive, ref, watch } from 'vue'
import { CAPTCHA_FIELD, TURNSTILE_TEST_SITE_KEY, captchaSiteKey, loadTurnstile, type Turnstile } from '../captcha'
import { getValueByPath } from '../conditions'
import { FORM_CONTEXT, type FormContext } from '../context'
import { fill, pluralText, resolveMessages } from '../messages'
import { cloneData, firstFieldError, type UploadStatus } from '../files'
import { browserStorage, draftDropsFiles, draftJson, draftVersion, readDraft, removeDraft, writeDraft, type DraftStorage } from '../draft'
import { pinsLightScheme, themeInlineStyle } from '../theme'
import { analyzeFormulas, calculatedDecimals, calculatedValue, calculationOrder } from '../formula'
import { fieldsByPath, listSeparator, pipeText } from '../pipe'
import { movedIndex, resolveScoped } from '../repeater'
import { collectCalculated, collectVisibleFields, pickVisibleData, scopedLookup, setValueByPath } from '../runtime'
import type { FormSchema } from '../schema'
import { queryPrefill } from '../prefill'
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
  /**
   * Where meta.saveDraft keeps the answers: the browser's localStorage when
   * omitted; null keeps nothing (the builder preview passes memory storage).
   */
  draftStorage?: DraftStorage | null | undefined
  /**
   * Run meta.captcha with Cloudflare's test site key (passes on any site):
   * the builder's preview, where the form's own key would refuse the domain.
   */
  captchaPreview?: boolean | undefined
  /**
   * The page address's query string, for meta.prefillFromQuery and hidden
   * fields with `param`: window.location.search when omitted; null reads
   * none (the builder preview passes the string it tests with).
   */
  prefillSearch?: string | null | undefined
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

// ---- save and continue later (meta.saveDraft, see draft.ts) ----
const draftOn = computed(() => props.schema.meta.saveDraft === true)
const draftStore = props.draftStorage === undefined ? browserStorage() : props.draftStorage
const draftVer = computed(() => draftVersion(props.schema.tree, 'lib'))
const draftHasFiles = computed(() => draftDropsFiles(props.schema.tree))
/** The answers as the form starts (and resets): nothing worth keeping. */
const draftPristine = draftJson(data)
/** The last answers saved or found saved (skips writing the same text twice). */
let draftLast = draftPristine
/** '' nothing kept; 'saved' answers kept; 'restored' kept answers came back. */
const draftState = ref<'' | 'saved' | 'restored'>('')
if (draftOn.value) {
  const saved = readDraft(draftStore, props.schema.meta.name, draftVer.value)
  if (saved) {
    for (const key of Object.keys(data)) if (key in saved) data[key] = saved[key]
    applyCalculations()
    draftLast = draftJson(data)
    draftState.value = 'restored'
    onMounted(() => emit('update:modelValue', cloneData(data)))
  }
}
// ---- prefill from the page address (meta.prefillFromQuery, hidden `param`; see prefill.ts) ----
// After a restored draft: what the link says wins.
{
  const search =
    props.prefillSearch !== undefined ? props.prefillSearch : typeof window !== 'undefined' ? window.location.search : null
  const entries = search === null ? [] : queryPrefill(props.schema.tree, search, { fields: props.schema.meta.prefillFromQuery === true })
  if (entries.length > 0) {
    for (const entry of entries) setValueByPath(data, entry.path, entry.value)
    applyCalculations()
    onMounted(() => emit('update:modelValue', cloneData(data)))
  }
}
function saveDraft(): void {
  if (!draftOn.value) return
  const json = draftJson(data)
  if (json === draftLast) return
  draftLast = json
  if (json === draftPristine) {
    removeDraft(draftStore, props.schema.meta.name)
    draftState.value = ''
  } else if (writeDraft(draftStore, props.schema.meta.name, draftVer.value, json) && draftState.value === '') {
    draftState.value = 'saved'
  }
}
/** The form was sent: nothing is kept (until the answers change again). */
function forgetDraft(): void {
  if (!draftOn.value) return
  removeDraft(draftStore, props.schema.meta.name)
  draftLast = draftJson(data)
  draftState.value = ''
}

watch(
  data,
  () => {
    applyCalculations()
    saveDraft()
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
  submitBlocked: () => uploading.value || captchaBlocks.value,
  submitHintId: () => (captchaBlocks.value && !captchaBroken.value ? captchaHintId.value : undefined),
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
context.moveItems = (repeaterPath, from, to) => remapItems(repeaterPath, (i) => movedIndex(i, from, to))

/** Back to the initial values, no errors shown; `message` is announced. */
function resetForm(message: string): void {
  const initial = initialData()
  for (const key of Object.keys(data)) delete data[key]
  Object.assign(data, initial)
  // After the data watcher has run (it re-validates touched fields).
  void nextTick(() => {
    touched.clear()
    submitted.value = false
    for (const key of Object.keys(errors)) errors[key] = null
    announce(message)
  })
}
/** Reset buttons. */
context.reset = () => resetForm(messages.value.formReset)

/** "Clear saved answers": forget them and start over. */
function clearDraft(): void {
  forgetDraft()
  resetForm(messages.value.draftCleared)
}

const uploadPercent = computed(() => Math.round(Math.min(1, Math.max(0, props.upload?.progress ?? 0)) * 100))
const uploading = computed(() => props.upload?.state === 'uploading')
watch(
  () => props.upload?.state,
  (state) => {
    if (state === 'uploading') announce(messages.value.uploadStarted)
    else if (state === 'done') announce(messages.value.submitted)
    else if (state === 'failed') {
      announce(messages.value.uploadFailed)
      // Not sent after all: keep the answers again.
      draftLast = ''
      saveDraft()
    }
  },
)

// ---- spam check (meta.captcha, see captcha.ts) ----
const captchaKey = computed(() => {
  const key = captchaSiteKey(props.schema.meta)
  return key && props.captchaPreview ? TURNSTILE_TEST_SITE_KEY : key
})
const captchaEl = ref<HTMLElement | null>(null)
const captchaToken = ref('')
const captchaBroken = ref(false)
/** The submit button waits for a passed check. */
const captchaBlocks = computed(() => captchaKey.value !== null && captchaToken.value === '')
const captchaHintId = computed(() => `fg-${props.schema.meta.name}-captcha`)
let captchaApi: Turnstile | null = null
let captchaWidget: string | null = null
let gone = false
function startCaptcha(): void {
  const key = captchaKey.value
  if (!key || !captchaEl.value || captchaWidget !== null) return
  loadTurnstile()
    .then((turnstile) => {
      // The key changed while the script loaded: the watcher starts again.
      if (gone || !captchaEl.value || captchaWidget !== null || captchaKey.value !== key) return
      captchaApi = turnstile
      captchaWidget = turnstile.render(captchaEl.value, {
        sitekey: key,
        language: props.schema.meta.locale,
        callback: (token: string) => {
          captchaToken.value = token
          captchaBroken.value = false
        },
        'expired-callback': () => (captchaToken.value = ''),
        'error-callback': () => {
          captchaToken.value = ''
          captchaBroken.value = true
        },
      })
    })
    .catch(() => (captchaBroken.value = true))
}
function stopCaptcha(): void {
  if (captchaWidget !== null) captchaApi?.remove(captchaWidget)
  captchaWidget = null
  captchaToken.value = ''
  captchaBroken.value = false
}
onMounted(startCaptcha)
// A new site key (the builder's settings): a new widget.
watch(captchaKey, () => {
  stopCaptcha()
  void nextTick(startCaptcha)
})
onBeforeUnmount(() => {
  gone = true
  stopCaptcha()
})

function onSubmit(): void {
  if (uploading.value) return
  submitted.value = true
  const ok = validateAll()
  submitAttempts.value++
  if (ok && captchaBlocks.value) {
    announce(messages.value.captchaWait)
  } else if (ok) {
    announce(messages.value.submitted)
    forgetDraft()
    const answers = pickVisibleData(props.schema.tree, data)
    if (captchaKey.value) {
      answers[CAPTCHA_FIELD] = captchaToken.value
      // A token works once: the check runs again for the next submission.
      captchaToken.value = ''
      if (captchaWidget !== null) captchaApi?.reset(captchaWidget)
    }
    emit('submit', answers)
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
    <div
      v-if="draftOn"
      class="fg-draft"
      data-fg-draft
    >
      <p class="fg-draft-text">
        {{ draftState === 'restored' ? messages.draftRestored : messages.draftOn }}<template v-if="draftHasFiles">
          {{ messages.draftNoFiles }}
        </template>
      </p>
      <button
        v-if="draftState !== ''"
        type="button"
        class="fg-draft-clear"
        data-fg-draft-clear
        @click="clearDraft"
      >
        {{ messages.draftClear }}
      </button>
    </div>
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
      v-if="captchaKey"
      class="fg-captcha"
      data-fg-captcha
    >
      <div ref="captchaEl" />
      <p
        v-if="captchaBroken"
        class="fg-error"
      >
        {{ messages.captchaFailed }}
      </p>
      <p
        v-else-if="captchaBlocks"
        :id="captchaHintId"
        class="fg-captcha-hint"
      >
        {{ messages.captchaWait }}
      </p>
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
          :disabled="uploading || captchaBlocks"
          :aria-describedby="captchaBlocks && !captchaBroken ? captchaHintId : undefined"
        >
          {{ submitText }}
        </button>
      </slot>
    </div>
  </form>
</template>
