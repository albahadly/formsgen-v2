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
  groupName,
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
        :for="`${fieldId}-${item.value}`"
      >
        <input
          :id="`${fieldId}-${item.value}`"
          v-model="selected"
          type="radio"
          :class="display === 'buttons' ? 'fg-sr-only' : 'fg-checkbox'"
          :aria-describedby="describedBy"
          :name="groupName"
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
