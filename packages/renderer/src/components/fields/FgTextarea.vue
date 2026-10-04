<script setup lang="ts">
import { computed } from 'vue'
import type { ElementNode } from '../../schema'
import { useField } from '../useField'

const props = defineProps<{ node: ElementNode; path: string }>()
const { value, error, label, description, placeholder, required, fieldId, onBlur } =
  useField(props)

const text = computed({
  get: () => String(value.value ?? ''),
  set: (v: string) => {
    value.value = v
  },
})
const rows = computed(() => Number(props.node.props['rows'] ?? 3))
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
    <textarea
      :id="fieldId"
      v-model="text"
      class="fg-textarea"
      :name="node.name"
      :rows="rows"
      :placeholder="placeholder"
      :aria-invalid="error ? 'true' : undefined"
      @blur="onBlur"
    />
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
