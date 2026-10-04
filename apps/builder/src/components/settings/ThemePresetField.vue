<script setup lang="ts">
// One preset-or-custom theme token (font, radius, spacing). The default
// preset clears the token; "Custom…" takes any plain CSS value.
import type { ThemePreset } from '@formsgen/renderer'
import { computed, ref, watch } from 'vue'
import { t } from '@/i18n'
import { useBuilderStore } from '@/stores/builder'

const props = defineProps<{
  token: string
  label: string
  presets: readonly ThemePreset[]
  defaultId: string
  /** i18n key prefix for preset names: `${optionKey}.${preset.id}`. */
  optionKey: string
  testid: string
}>()

const builder = useBuilderStore()
const current = computed(() => builder.schema.meta.theme?.[props.token])
const matched = computed(() =>
  current.value === undefined
    ? props.defaultId
    : props.presets.find((preset) => preset.value === current.value)?.id,
)

const customOpen = ref(false)
const draft = ref(current.value ?? '')
const invalid = ref(false)

// Undo/redo or "Reset theme" change the value under us.
watch(current, (value) => {
  if (value !== draft.value.trim()) draft.value = value ?? ''
  invalid.value = false
})

const selected = computed({
  get: () => (customOpen.value || matched.value === undefined ? 'custom' : matched.value),
  set: (id: string) => {
    invalid.value = false
    if (id === 'custom') {
      customOpen.value = true
      draft.value = current.value ?? ''
      return
    }
    customOpen.value = false
    const preset = props.presets.find((p) => p.id === id)
    builder.setThemeToken(props.token, id === props.defaultId || !preset ? null : preset.value)
  },
})

function onDraftInput(): void {
  invalid.value = !builder.setThemeToken(props.token, draft.value.trim() || null)
}
</script>

<template>
  <div class="flex flex-col gap-1 text-xs font-medium text-gray-600">
    <label class="flex flex-col gap-1">
      {{ label }}
      <select
        v-model="selected"
        class="rounded border border-gray-300 px-2 py-1.5 text-sm font-normal"
        :data-testid="testid"
      >
        <option
          v-for="preset in presets"
          :key="preset.id"
          :value="preset.id"
        >
          {{ t(`${optionKey}.${preset.id}`) }}
        </option>
        <option value="custom">
          {{ t('settings.custom') }}
        </option>
      </select>
    </label>
    <input
      v-if="selected === 'custom'"
      v-model="draft"
      type="text"
      dir="ltr"
      class="rounded border px-2 py-1.5 font-mono text-sm font-normal"
      :class="invalid ? 'border-red-400' : 'border-gray-300'"
      :aria-label="`${label} — ${t('settings.customValue')}`"
      :aria-invalid="invalid || undefined"
      :placeholder="presets.find((p) => p.id === defaultId)?.value"
      :data-testid="`${testid}-custom`"
      @input="onDraftInput"
    >
    <span
      v-if="invalid"
      class="font-normal text-red-600"
      :data-testid="`${testid}-error`"
    >{{ t('settings.invalidValue') }}</span>
  </div>
</template>
