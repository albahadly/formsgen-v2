<script setup lang="ts">
import { computed } from 'vue'
import type { ElementNode } from '../../schema'
import { useField } from '../useField'

interface Item {
  value: string
  label: string
}

const props = defineProps<{ node: ElementNode; path: string }>()
const { value, error, label, description, required, fieldId, errorId, describedBy, onBlur } =
  useField(props)

const items = computed<Item[]>(() => {
  const raw = props.node.props['items']
  return Array.isArray(raw) ? (raw as Item[]) : []
})

const picked = computed({
  get: () => (Array.isArray(value.value) ? (value.value as string[]) : []),
  set: (v: string[]) => {
    value.value = v
  },
})

const size = computed(() => Math.min(Math.max(items.value.length, 2), 6))
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
      v-model="picked"
      class="fg-select fg-select--multiple"
      multiple
      :size="size"
      :name="node.name"
      :aria-invalid="error ? 'true' : undefined"
      :aria-describedby="describedBy"
      @blur="onBlur"
    >
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
