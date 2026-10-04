<script setup lang="ts">
import { provide, reactive, ref, watch } from 'vue'
import { getValueByPath } from '../conditions'
import { FORM_CONTEXT, type FormContext } from '../context'
import { evaluateRules } from '../rules'
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

const lookup = (field: string): unknown => getValueByPath(data, field)

function validateField(path: string): void {
  const field = collectVisibleFields(props.schema.tree, data).find((f) => f.path === path)
  if (!field) {
    errors[path] = null
    return
  }
  const violations = evaluateRules(field.node.validation, lookup(path), lookup)
  errors[path] = violations[0]?.message ?? null
}

/** Validates every visible field; clears stale errors; true when clean. */
function validateAll(): boolean {
  for (const key of Object.keys(errors)) errors[key] = null
  let ok = true
  for (const field of collectVisibleFields(props.schema.tree, data)) {
    const violations = evaluateRules(field.node.validation, lookup(field.path), lookup)
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

const context: FormContext = {
  getValue: (path) => getValueByPath(data, path),
  setValue: (path, value) => setValueByPath(data, path, value),
  getError: (path) => (touched.has(path) || submitted.value ? (errors[path] ?? null) : null),
  touch: (path) => {
    touched.add(path)
    validateField(path)
  },
  isSubmitted: () => submitted.value,
}
provide(FORM_CONTEXT, context)

function onSubmit(): void {
  submitted.value = true
  if (validateAll()) {
    emit('submit', pickVisibleData(props.schema.tree, data))
  }
}
</script>

<template>
  <form
    class="fg-form"
    :dir="schema.meta.dir"
    novalidate
    @submit.prevent="onSubmit"
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
    <div class="fg-actions">
      <slot name="actions">
        <button
          class="fg-button fg-button--primary"
          type="submit"
        >
          Submit
        </button>
      </slot>
    </div>
  </form>
</template>
