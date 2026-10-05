<script setup lang="ts">
import { computed } from 'vue'
import { TEXT_INPUT_TYPES } from '../../elements'
import type { ElementNode } from '../../schema'
import { useField } from '../useField'
import FgAffix from './FgAffix.vue'
import FgFieldLabel from './FgFieldLabel.vue'
import FgFloat from './FgFloat.vue'

const props = defineProps<{ node: ElementNode; path: string }>()
const {
  value,
  error,
  description,
  placeholder,
  fieldId,
  errorId,
  describedBy,
  onBlur,
  sizeClass,
  prefix,
  suffix,
  floating,
} = useField(props)

const inputType = computed(() => TEXT_INPUT_TYPES[props.node.type] ?? 'text')

const text = computed({
  get: () => String(value.value ?? ''),
  set: (v: string) => {
    value.value = v
  },
})

const affixDescribedBy = computed(
  () =>
    [prefix.value && `${fieldId.value}-prefix`, suffix.value && `${fieldId.value}-suffix`, describedBy.value]
      .filter(Boolean)
      .join(' ') || undefined,
)
</script>

<template>
  <div
    class="fg-field"
    :class="{ 'fg-field--error': error }"
  >
    <FgFieldLabel
      v-if="!floating"
      :node="node"
      :for-id="fieldId"
    />
    <FgFloat
      :node="node"
      :for-id="fieldId"
      :floating="floating"
    >
      <FgAffix
        :id="fieldId"
        :prefix="prefix"
        :suffix="suffix"
      >
        <input
          :id="fieldId"
          v-model="text"
          class="fg-input"
          :class="[sizeClass, { 'fg-input--color': inputType === 'color' }]"
          :type="inputType"
          :name="node.name"
          :placeholder="floating ? placeholder || ' ' : placeholder"
          :aria-invalid="error ? 'true' : undefined"
          :aria-describedby="affixDescribedBy"
          @blur="onBlur"
        >
      </FgAffix>
    </FgFloat>
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
