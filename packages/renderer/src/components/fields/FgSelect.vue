<script setup lang="ts">
import { computed } from 'vue'
import type { ElementNode } from '../../schema'
import { useField } from '../useField'

interface SelectItem {
  value: string
  label: string
}

const props = defineProps<{ node: ElementNode; path: string }>()
const { value, error, label, description, placeholder, required, fieldId, errorId, describedBy, onBlur } =
  useField(props)

const items = computed<SelectItem[]>(() => {
  const raw = props.node.props['items']
  return Array.isArray(raw) ? (raw as SelectItem[]) : []
})

const selected = computed({
  get: () => (value.value === null || value.value === undefined ? '' : String(value.value)),
  set: (v: string) => {
    value.value = v === '' ? null : v
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
    </label>
    <select
      :id="fieldId"
      v-model="selected"
      class="fg-select"
      :name="node.name"
      :aria-invalid="error ? 'true' : undefined"
      :aria-describedby="describedBy"
      @blur="onBlur"
    >
      <option
        value=""
        disabled
      >
        {{ placeholder || '—' }}
      </option>
      <option
        v-for="item in items"
        :key="item.value"
        :value="item.value"
      >
        {{ item.label }}
      </option>
    </select>
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
