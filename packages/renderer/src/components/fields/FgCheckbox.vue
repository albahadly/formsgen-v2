<script setup lang="ts">
import { computed } from 'vue'
import type { ElementNode } from '../../schema'
import { useField } from '../useField'

const props = defineProps<{ node: ElementNode; path: string }>()
const { value, error, label, description, fieldId, errorId, describedBy, required, onBlur } =
  useField(props)

const checked = computed({
  get: () => value.value === true,
  set: (v: boolean) => {
    value.value = v
  },
})
</script>

<template>
  <div
    class="fg-field fg-field--checkbox"
    :class="{ 'fg-field--error': error }"
  >
    <label
      class="fg-checkbox-label"
      :for="fieldId"
    >
      <input
        :id="fieldId"
        v-model="checked"
        class="fg-checkbox"
        type="checkbox"
        :name="node.name"
        :aria-invalid="error ? 'true' : undefined"
        :aria-describedby="describedBy"
        @blur="onBlur"
      >
      <span>
        {{ label }}<span
          v-if="required"
          class="fg-required"
          aria-hidden="true"
        >*</span>
      </span>
    </label>
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
