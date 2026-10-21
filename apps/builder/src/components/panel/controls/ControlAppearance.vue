<script setup lang="ts">
import {
  CLASS_TOKEN_PATTERN,
  type ControlSize,
  type ElementNode,
  type TextAlign,
  type TextTone,
} from '@formsgen/renderer'
import { ref, watch } from 'vue'
import { t } from '@/i18n'
import type { AppearanceFeature } from '@/registry/types'
import { useBuilderStore } from '@/stores/builder'

const props = defineProps<{ node: ElementNode; features: AppearanceFeature[] }>()
const store = useBuilderStore()

const has = (feature: AppearanceFeature): boolean => props.features.includes(feature)
const selectClass = 'rounded border border-gray-300 dark:border-gray-600 px-2 py-1.5 text-sm font-normal'

function setSize(value: string): void {
  store.setStyle(props.node.id, { size: value === '' ? undefined : (value as ControlSize) })
}
function setAlign(value: string): void {
  store.setStyle(props.node.id, { align: value === '' ? undefined : (value as TextAlign) })
}
function setTone(value: string): void {
  store.setStyle(props.node.id, { tone: value === '' ? undefined : (value as TextTone) })
}
function setHideLabel(value: boolean): void {
  store.setStyle(props.node.id, { hideLabel: value })
}

// Custom classes: commit only valid input, keep the draft while editing.
const classDraft = ref(props.node.style?.className ?? '')
const classError = ref(false)
watch(
  () => props.node.id,
  () => {
    classDraft.value = props.node.style?.className ?? ''
    classError.value = false
  },
)
function onClassInput(): void {
  const tokens = classDraft.value.split(/\s+/).filter(Boolean)
  classError.value = !tokens.every((token) => CLASS_TOKEN_PATTERN.test(token))
  if (!classError.value) store.setStyle(props.node.id, { className: tokens.join(' ') })
}
</script>

<template>
  <div
    class="flex flex-col gap-2"
    data-testid="appearance-editor"
  >
    <label
      v-if="has('size')"
      class="flex flex-col gap-1 text-xs font-medium text-gray-600 dark:text-gray-300"
    >
      {{ t('properties.appearance.size') }}
      <select
        :class="selectClass"
        :value="node.style?.size ?? ''"
        data-testid="appearance-size"
        @change="setSize(($event.target as HTMLSelectElement).value)"
      >
        <option value="">{{ t('properties.appearance.size.default') }}</option>
        <option value="sm">{{ t('properties.appearance.size.sm') }}</option>
        <option value="md">{{ t('properties.appearance.size.md') }}</option>
        <option value="lg">{{ t('properties.appearance.size.lg') }}</option>
      </select>
    </label>

    <label
      v-if="has('align')"
      class="flex flex-col gap-1 text-xs font-medium text-gray-600 dark:text-gray-300"
    >
      {{ t('properties.appearance.align') }}
      <select
        :class="selectClass"
        :value="node.style?.align ?? ''"
        data-testid="appearance-align"
        @change="setAlign(($event.target as HTMLSelectElement).value)"
      >
        <option value="">{{ t('properties.appearance.align.start') }}</option>
        <option value="center">{{ t('properties.appearance.align.center') }}</option>
        <option value="end">{{ t('properties.appearance.align.end') }}</option>
      </select>
    </label>

    <label
      v-if="has('tone')"
      class="flex flex-col gap-1 text-xs font-medium text-gray-600 dark:text-gray-300"
    >
      {{ t('properties.appearance.tone') }}
      <select
        :class="selectClass"
        :value="node.style?.tone ?? ''"
        data-testid="appearance-tone"
        @change="setTone(($event.target as HTMLSelectElement).value)"
      >
        <option value="">{{ t('properties.appearance.tone.default') }}</option>
        <option value="muted">{{ t('properties.appearance.tone.muted') }}</option>
        <option value="primary">{{ t('properties.appearance.tone.primary') }}</option>
        <option value="danger">{{ t('properties.appearance.tone.danger') }}</option>
      </select>
    </label>

    <label
      v-if="has('hideLabel')"
      class="inline-flex items-start gap-2 text-xs font-medium text-gray-600 dark:text-gray-300"
    >
      <input
        type="checkbox"
        class="mt-0.5 h-3.5 w-3.5 accent-indigo-600"
        :checked="node.style?.hideLabel === true"
        data-testid="appearance-hide-label"
        @change="setHideLabel(($event.target as HTMLInputElement).checked)"
      >
      {{ t('properties.appearance.hideLabel') }}
    </label>

    <label
      v-if="has('className')"
      class="flex flex-col gap-1 text-xs font-medium text-gray-600 dark:text-gray-300"
    >
      {{ t('properties.appearance.className') }}
      <input
        v-model="classDraft"
        type="text"
        dir="ltr"
        placeholder="my-field shadow-lg"
        class="rounded border px-2 py-1.5 font-mono text-sm font-normal"
        :class="classError ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'"
        data-testid="appearance-class"
        @input="onClassInput"
      >
      <span
        v-if="classError"
        class="font-normal text-red-600 dark:text-red-400"
        data-testid="appearance-class-error"
      >
        {{ t('properties.appearance.className.invalid') }}
      </span>
    </label>
  </div>
</template>
