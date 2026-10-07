<script setup lang="ts">
import { computed } from 'vue'
import { choiceDisplay } from '../../elements'
import type { ElementNode } from '../../schema'
import { useField } from '../useField'
import FgTip from './FgTip.vue'

interface Item {
  value: string
  label: string
}

const props = defineProps<{ node: ElementNode; path: string }>()

/** props.display: plain list, bordered blocks, or a segmented button row. */
const display = computed(() => choiceDisplay(props.node))
const {
  value,
  error,
  label,
  description,
  required,
  fieldId,
  tooltip,
  errorId,
  describedBy,
  onBlur,
  labelClass,
} = useField(props)

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
</script>

<template>
  <fieldset
    class="fg-field"
    :class="{ 'fg-field--error': error }"
    :aria-labelledby="tooltip ? `${fieldId}-legend` : undefined"
  >
    <legend :class="labelClass">
      <span :id="`${fieldId}-legend`">{{ label }}</span><span
        v-if="required"
        class="fg-required"
        aria-hidden="true"
      >*</span>
      <FgTip
        v-if="tooltip"
        :id="`${fieldId}-tip`"
        :text="tooltip"
      />
    </legend>
    <div
      class="fg-options"
      :class="display === 'list' ? undefined : `fg-options--${display}`"
    >
      <label
        v-for="item in items"
        :key="item.value"
        class="fg-option"
        :class="display === 'list' ? undefined : `fg-option--${display === 'blocks' ? 'block' : 'button'}`"
        :for="`${fieldId}-opt-${item.value}`"
      >
        <input
          :id="`${fieldId}-opt-${item.value}`"
          v-model="picked"
          type="checkbox"
          :class="display === 'buttons' ? 'fg-sr-only' : 'fg-checkbox'"
          :aria-describedby="describedBy"
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
      :id="errorId"
      class="fg-error"
      role="alert"
    >
      {{ error }}
    </p>
  </fieldset>
</template>
