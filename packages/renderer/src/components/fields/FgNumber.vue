<script setup lang="ts">
import { computed } from 'vue'
import type { ElementNode } from '../../schema'
import { useField } from '../useField'
import FgAffix from './FgAffix.vue'
import FgFieldLabel from './FgFieldLabel.vue'

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
} = useField(props)

const num = computed({
  get: () => {
    const v = value.value
    return typeof v === 'number' ? String(v) : ''
  },
  set: (v: string) => {
    value.value = v === '' ? null : Number(v)
  },
})

const min = computed(() => props.node.props['min'] as number | undefined)
const max = computed(() => props.node.props['max'] as number | undefined)
const step = computed(() => props.node.props['step'] as number | undefined)

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
      :node="node"
      :for-id="fieldId"
    />
    <FgAffix
      :id="fieldId"
      :prefix="prefix"
      :suffix="suffix"
    >
      <input
        :id="fieldId"
        v-model="num"
        class="fg-input"
        :class="sizeClass"
        type="number"
        :name="node.name"
        :placeholder="placeholder"
        :min="min"
        :max="max"
        :step="step"
        :aria-invalid="error ? 'true' : undefined"
        :aria-describedby="affixDescribedBy"
        @blur="onBlur"
      >
    </FgAffix>
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
