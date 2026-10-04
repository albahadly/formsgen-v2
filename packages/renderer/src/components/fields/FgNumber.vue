<script setup lang="ts">
import { computed } from 'vue'
import type { ElementNode } from '../../schema'
import { useField } from '../useField'

const props = defineProps<{ node: ElementNode; path: string }>()
const { value, error, label, description, placeholder, required, fieldId, onBlur } =
  useField(props)

const num = computed({
  get: () => {
    const v = value.value
    return typeof v === 'number' ? String(v) : ''
  },
  set: (v: string) => {
    value.value = v === '' ? null : Number(v)
  },
})

const min = computed(() => props.node.props['min'] as number | undefined)
const max = computed(() => props.node.props['max'] as number | undefined)
const step = computed(() => props.node.props['step'] as number | undefined)
</script>

<template>
  <div
    class="fg-field"
    :class="{ 'fg-field--error': error }"
  >
    <label
      class="fg-label"
      :for="fieldId"
    >
      {{ label }}<span
        v-if="required"
        class="fg-required"
        aria-hidden="true"
      >*</span>
    </label>
    <input
      :id="fieldId"
      v-model="num"
      class="fg-input"
      type="number"
      :name="node.name"
      :placeholder="placeholder"
      :min="min"
      :max="max"
      :step="step"
      :aria-invalid="error ? 'true' : undefined"
      @blur="onBlur"
    >
    <p
      v-if="description"
      class="fg-description"
    >
      {{ description }}
    </p>
    <p
      v-if="error"
      class="fg-error"
      role="alert"
    >
      {{ error }}
    </p>
  </div>
</template>
