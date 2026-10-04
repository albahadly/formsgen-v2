<script setup lang="ts">
import { computed } from 'vue'
import type { ElementNode } from '../../schema'
import { useField } from '../useField'

const props = defineProps<{ node: ElementNode; path: string }>()
const { value, error, label, description, required, fieldId, errorId, describedBy, onBlur } = useField(props)

const min = computed(() => Number(props.node.props['min'] ?? 0))
const max = computed(() => Number(props.node.props['max'] ?? 100))
const step = computed(() => Number(props.node.props['step'] ?? 1))

const current = computed({
  get: () => String(typeof value.value === 'number' ? value.value : min.value),
  set: (v: string) => {
    value.value = Number(v)
  },
})
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
      <span class="fg-range-value">{{ current }}</span>
    </label>
    <input
      :id="fieldId"
      v-model="current"
      class="fg-range"
      type="range"
      :aria-describedby="describedBy"
      :name="node.name"
      :min="min"
      :max="max"
      :step="step"
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
