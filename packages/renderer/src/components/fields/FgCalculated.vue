<script setup lang="ts">
// Calculated field: a read-only box showing the formula's result (see
// formula.ts). The form computes the value; people can't type in it.
import { computed } from 'vue'
import { calculatedDecimals, formatCalculated } from '../../formula'
import type { ElementNode } from '../../schema'
import { useField } from '../useField'
import FgAffix from './FgAffix.vue'
import FgFieldLabel from './FgFieldLabel.vue'

const props = defineProps<{ node: ElementNode; path: string }>()
const { value, error, description, fieldId, errorId, describedBy, sizeClass, prefix, suffix } = useField(props)

const shown = computed(() => formatCalculated(value.value, calculatedDecimals(props.node)))
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
        class="fg-input fg-calculated"
        :class="sizeClass"
        type="text"
        readonly
        :value="shown"
        :aria-invalid="error ? 'true' : undefined"
        :aria-describedby="affixDescribedBy"
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
