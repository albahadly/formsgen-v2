<script setup lang="ts">
import { computed } from 'vue'
import type { ElementNode } from '../../schema'
import { useField } from '../useField'

interface Item {
  value: string
  label: string
}

const props = defineProps<{ node: ElementNode; path: string }>()
const { value, error, label, description, required, fieldId, onBlur } = useField(props)

const items = computed<Item[]>(() => {
  const raw = props.node.props['items']
  return Array.isArray(raw) ? (raw as Item[]) : []
})

const selected = computed({
  get: () => (typeof value.value === 'string' ? value.value : null),
  set: (v: string | null) => {
    value.value = v
  },
})
</script>

<template>
  <fieldset
    class="fg-field"
    :class="{ 'fg-field--error': error }"
  >
    <legend class="fg-label">
      {{ label }}<span
        v-if="required"
        class="fg-required"
        aria-hidden="true"
      >*</span>
    </legend>
    <div class="fg-options">
      <label
        v-for="item in items"
        :key="item.value"
        class="fg-option"
        :for="`${fieldId}-${item.value}`"
      >
        <input
          :id="`${fieldId}-${item.value}`"
          v-model="selected"
          type="radio"
          class="fg-checkbox"
          :name="path"
          :value="item.value"
          @blur="onBlur"
        >
        <span>{{ item.label }}</span>
      </label>
    </div>
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
  </fieldset>
</template>
