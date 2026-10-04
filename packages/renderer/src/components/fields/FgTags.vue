<script setup lang="ts">
import { computed, inject, ref } from 'vue'
import { FORM_CONTEXT } from '../../context'
import { MESSAGES, fill } from '../../messages'
import type { ElementNode } from '../../schema'
import { useField } from '../useField'

const props = defineProps<{ node: ElementNode; path: string }>()
const { value, error, label, description, placeholder, required, fieldId, errorId, describedBy, onBlur } =
  useField(props)

const ctx = inject(FORM_CONTEXT)
const removeLabel = (tag: string): string =>
  fill((ctx?.messages?.() ?? MESSAGES.en).removeTag, { tag })

const draft = ref('')

const tags = computed(() => (Array.isArray(value.value) ? (value.value as string[]) : []))

function addTag(): void {
  const next = draft.value.trim()
  if (next !== '' && !tags.value.includes(next)) {
    value.value = [...tags.value, next]
  }
  draft.value = ''
}

function removeTag(index: number): void {
  value.value = tags.value.filter((_, i) => i !== index)
}

function onBackspace(): void {
  if (draft.value === '' && tags.value.length > 0) removeTag(tags.value.length - 1)
}
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
    <div class="fg-tags">
      <span
        v-for="(tag, index) in tags"
        :key="tag"
        class="fg-tag"
      >
        {{ tag }}
        <button
          type="button"
          class="fg-tag-remove"
          :aria-label="removeLabel(tag)"
          @click="removeTag(index)"
        >
          ×
        </button>
      </span>
      <input
        :id="fieldId"
        v-model="draft"
        class="fg-tags-input"
        type="text"
        :name="node.name"
        :placeholder="placeholder"
        :aria-invalid="error ? 'true' : undefined"
        :aria-describedby="describedBy"
        @keydown.enter.prevent="addTag"
        @keydown.,.prevent="addTag"
        @keydown.backspace="onBackspace"
        @blur="addTag(); onBlur()"
      >
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
