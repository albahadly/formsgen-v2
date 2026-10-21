<script setup lang="ts">
// Address: a text input with suggestions (suggest.ts) in a datalist, asked
// of the provider after a short pause once enough is typed. The value is
// the text itself, whether picked or typed.
import { computed, onBeforeUnmount, ref } from 'vue'
import type { ElementNode } from '../../schema'
import { suggestMinChars, suggestUrl, suggestionTexts } from '../../suggest'
import { useField } from '../useField'
import FgAffix from './FgAffix.vue'
import FgFieldLabel from './FgFieldLabel.vue'
import FgFloat from './FgFloat.vue'

const props = defineProps<{ node: ElementNode; path: string }>()
const { value, error, description, placeholder, fieldId, errorId, describedBy, onBlur, sizeClass, prefix, suffix, floating } = useField(props)

const text = computed({
  get: () => String(value.value ?? ''),
  set: (v: string) => {
    value.value = v
    schedule(v)
  },
})
const listId = computed(() => `${fieldId.value}-list`)
const suggestions = ref<string[]>([])
let timer: ReturnType<typeof setTimeout> | undefined
let request = 0

function schedule(typed: string): void {
  if (timer !== undefined) clearTimeout(timer)
  const q = typed.trim()
  if (q.length < suggestMinChars(props.node)) {
    suggestions.value = []
    return
  }
  timer = setTimeout(() => void load(q), 300)
}
async function load(q: string): Promise<void> {
  const mine = ++request
  try {
    const response = await fetch(suggestUrl(props.node).replace('{q}', encodeURIComponent(q)))
    const data: unknown = await response.json()
    if (mine === request) suggestions.value = suggestionTexts(data)
  } catch {
    if (mine === request) suggestions.value = []
  }
}
onBeforeUnmount(() => {
  if (timer !== undefined) clearTimeout(timer)
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
          :class="sizeClass"
          type="text"
          autocomplete="off"
          :list="listId"
          :name="node.name"
          :placeholder="floating ? placeholder || ' ' : placeholder"
          :aria-invalid="error ? 'true' : undefined"
          :aria-describedby="affixDescribedBy"
          @blur="onBlur"
        >
      </FgAffix>
    </FgFloat>
    <datalist :id="listId">
      <option
        v-for="s in suggestions"
        :key="s"
        :value="s"
      />
    </datalist>
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
