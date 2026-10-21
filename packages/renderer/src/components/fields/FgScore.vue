<script setup lang="ts">
// A star rating (1..stars) or an NPS scale (0..10): radios underneath, a
// number or null as the value. Stars sit in reverse DOM order so CSS can
// fill every star up to the chosen one (input:checked ~ label).
import { computed } from 'vue'
import { ratingStars } from '../../elements'
import { MESSAGES } from '../../messages'
import type { ElementNode } from '../../schema'
import { useField } from '../useField'
import FgTip from './FgTip.vue'

const props = defineProps<{ node: ElementNode; path: string }>()

const { ctx, value, error, label, description, required, fieldId, groupName, tooltip, errorId, describedBy, onBlur, labelClass } = useField(props)
const messages = computed(() => ctx.messages?.() ?? MESSAGES.en)

const isRating = computed(() => props.node.type === 'rating')
const values = computed<number[]>(() => {
  if (!isRating.value) return Array.from({ length: 11 }, (_, i) => i)
  const stars = ratingStars(props.node)
  return Array.from({ length: stars }, (_, i) => stars - i)
})
const selected = computed({
  get: () => (typeof value.value === 'number' ? value.value : null),
  set: (v: number | null) => {
    value.value = v
  },
})
const text = (key: 'lowLabel' | 'highLabel'): string => {
  const own = props.node.props[key]
  return typeof own === 'string' && own.trim() !== '' ? own : key === 'lowLabel' ? messages.value.npsLow : messages.value.npsHigh
}
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
    <div :class="isRating ? 'fg-rating' : 'fg-nps'">
      <template
        v-for="n in values"
        :key="n"
      >
        <input
          :id="`${fieldId}-${n}`"
          v-model="selected"
          type="radio"
          class="fg-sr-only"
          :name="groupName"
          :value="n"
          :aria-describedby="describedBy"
          @blur="onBlur"
        >
        <label
          :class="isRating ? 'fg-rating-star' : 'fg-nps-option'"
          :for="`${fieldId}-${n}`"
        ><span
          v-if="isRating"
          class="fg-sr-only"
        >{{ n }}</span><template v-else>{{ n }}</template></label>
      </template>
    </div>
    <div
      v-if="!isRating"
      class="fg-nps-ends"
      aria-hidden="true"
    >
      <span>{{ text('lowLabel') }}</span><span>{{ text('highLabel') }}</span>
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
