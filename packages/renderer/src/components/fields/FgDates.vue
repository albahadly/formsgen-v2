<script setup lang="ts">
// Multiple dates: a native date input plus an Add button; chosen dates
// are listed in calendar order as removable chips.
import { computed, ref } from 'vue'
import { addDate, removeDateLabel } from '../../composite'
import { MESSAGES } from '../../messages'
import type { ElementNode } from '../../schema'
import { useField } from '../useField'
import FgFieldLabel from './FgFieldLabel.vue'

const props = defineProps<{ node: ElementNode; path: string }>()
const { ctx, value, error, description, fieldId, errorId, describedBy, onBlur, sizeClass } =
  useField(props)

const messages = computed(() => ctx.messages?.() ?? MESSAGES.en)
const dates = computed(() => (Array.isArray(value.value) ? (value.value as string[]) : []))
const draft = ref('')

function add(): void {
  value.value = addDate(dates.value, draft.value)
  draft.value = ''
  onBlur()
}

function remove(index: number): void {
  value.value = dates.value.filter((_, i) => i !== index)
  onBlur()
}
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
    <div class="fg-pair">
      <input
        :id="fieldId"
        v-model="draft"
        class="fg-input"
        :class="sizeClass"
        type="date"
        :aria-invalid="error ? 'true' : undefined"
        :aria-describedby="describedBy"
        @keydown.enter.prevent="add"
      >
      <button
        type="button"
        class="fg-button fg-button--secondary fg-pair-button"
        @click="add"
      >
        {{ messages.addDate }}
      </button>
    </div>
    <div
      v-if="dates.length"
      class="fg-chips"
    >
      <span
        v-for="(date, index) in dates"
        :key="date"
        class="fg-tag"
      >
        {{ date }}
        <button
          type="button"
          class="fg-tag-remove"
          :aria-label="removeDateLabel(date, messages)"
          @click="remove(index)"
        >
          ×
        </button>
      </span>
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
  </div>
</template>
