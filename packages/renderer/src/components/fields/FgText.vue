<script setup lang="ts">
import { computed } from 'vue'
import { TEXT_INPUT_TYPES } from '../../elements'
import type { ElementNode } from '../../schema'
import { useField } from '../useField'

const props = defineProps<{ node: ElementNode; path: string }>()
const {
  value,
  error,
  label,
  description,
  placeholder,
  required,
  fieldId,
  errorId,
  describedBy,
  onBlur,
  labelClass,
  sizeClass,
} = useField(props)

const inputType = computed(() => TEXT_INPUT_TYPES[props.node.type] ?? 'text')

const text = computed({
  get: () => String(value.value ?? ''),
  set: (v: string) => {
    value.value = v
  },
})
</script>

<template>
  <div
    class="fg-field"
    :class="{ 'fg-field--error': error }"
  >
    <label
      :class="labelClass"
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
      v-model="text"
      class="fg-input"
      :class="[sizeClass, { 'fg-input--color': inputType === 'color' }]"
      :type="inputType"
      :name="node.name"
      :placeholder="placeholder"
      :aria-invalid="error ? 'true' : undefined"
      :aria-describedby="describedBy"
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
      :id="errorId"
      class="fg-error"
      role="alert"
    >
      {{ error }}
    </p>
  </div>
</template>
