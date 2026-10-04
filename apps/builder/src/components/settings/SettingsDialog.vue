<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { t } from '@/i18n'
import { useBuilderStore, type NameError } from '@/stores/builder'
import { useUiStore } from '@/stores/ui'

const builder = useBuilderStore()
const ui = useUiStore()

const nameDraft = ref(builder.schema.meta.name)
const nameError = ref<NameError>(null)

watch(
  () => ui.showSettings,
  (open) => {
    if (open) {
      nameDraft.value = builder.schema.meta.name
      nameError.value = null
    }
  },
)

function onNameInput(): void {
  nameError.value = builder.setMetaName(nameDraft.value)
}

const title = computed({
  get: () => builder.schema.meta.title ?? '',
  set: (v: string) => builder.updateMeta({ title: v || undefined }),
})

const locale = computed({
  get: () => builder.schema.meta.locale,
  set: (v: string) => builder.updateMeta({ locale: v || 'en' }),
})

const dir = computed({
  get: () => builder.schema.meta.dir,
  set: (v: 'ltr' | 'rtl') => builder.updateMeta({ dir: v }),
})

const submitUrl = computed({
  get: () => builder.schema.meta.submit?.url ?? '',
  set: (v: string) =>
    builder.updateMeta({
      submit: v === '' ? undefined : { ...builder.schema.meta.submit, url: v },
    }),
})

const submitMethod = computed({
  get: () => builder.schema.meta.submit?.method ?? 'POST',
  set: (v: 'POST' | 'PUT') =>
    builder.updateMeta({
      submit: { ...builder.schema.meta.submit, method: v },
    }),
})

const primaryColor = computed({
  get: () => builder.schema.meta.theme?.['color-primary'] ?? '#4f46e5',
  set: (v: string) => builder.setThemeToken('color-primary', v),
})

const radius = computed({
  get: () => builder.schema.meta.theme?.['radius'] ?? '',
  set: (v: string) => builder.setThemeToken('radius', v),
})

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') ui.closeSettings()
}
</script>

<template>
  <div
    v-if="ui.showSettings"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    data-testid="settings-dialog"
    @click.self="ui.closeSettings()"
    @keydown="onKeydown"
  >
    <div
      class="w-full max-w-md rounded-lg bg-white p-5 shadow-xl"
      role="dialog"
      aria-modal="true"
      :aria-label="t('settings.title')"
    >
      <div class="mb-4 flex items-center justify-between">
        <h2 class="text-sm font-semibold text-gray-800">
          {{ t('settings.title') }}
        </h2>
        <button
          type="button"
          class="rounded px-2 py-1 text-sm text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          data-testid="settings-close"
          :aria-label="t('settings.close')"
          @click="ui.closeSettings()"
        >
          ✕
        </button>
      </div>

      <div class="flex flex-col gap-3">
        <label class="flex flex-col gap-1 text-xs font-medium text-gray-600">
          {{ t('settings.formTitle') }}
          <input
            v-model="title"
            type="text"
            class="rounded border border-gray-300 px-2 py-1.5 text-sm font-normal"
            data-testid="settings-title"
          >
        </label>

        <label class="flex flex-col gap-1 text-xs font-medium text-gray-600">
          {{ t('settings.formName') }}
          <input
            v-model="nameDraft"
            type="text"
            class="rounded border px-2 py-1.5 font-mono text-sm font-normal"
            :class="nameError ? 'border-red-400' : 'border-gray-300'"
            data-testid="settings-name"
            @input="onNameInput"
          >
          <span
            v-if="nameError"
            class="font-normal text-red-600"
            data-testid="settings-name-error"
          >
            {{ t(`properties.name.${nameError}`) }}
          </span>
        </label>

        <div class="grid grid-cols-2 gap-3">
          <label class="flex flex-col gap-1 text-xs font-medium text-gray-600">
            {{ t('settings.locale') }}
            <input
              v-model="locale"
              type="text"
              class="rounded border border-gray-300 px-2 py-1.5 text-sm font-normal"
              data-testid="settings-locale"
            >
          </label>
          <label class="flex flex-col gap-1 text-xs font-medium text-gray-600">
            {{ t('settings.direction') }}
            <select
              v-model="dir"
              class="rounded border border-gray-300 px-2 py-1.5 text-sm font-normal"
              data-testid="settings-dir"
            >
              <option value="ltr">LTR</option>
              <option value="rtl">RTL</option>
            </select>
          </label>
        </div>

        <div class="grid grid-cols-[1fr_auto] gap-3">
          <label class="flex flex-col gap-1 text-xs font-medium text-gray-600">
            {{ t('settings.submitUrl') }}
            <input
              v-model="submitUrl"
              type="url"
              placeholder="https://api.example.com/submit"
              class="rounded border border-gray-300 px-2 py-1.5 text-sm font-normal"
              data-testid="settings-submit-url"
            >
          </label>
          <label class="flex flex-col gap-1 text-xs font-medium text-gray-600">
            {{ t('settings.submitMethod') }}
            <select
              v-model="submitMethod"
              class="rounded border border-gray-300 px-2 py-1.5 text-sm font-normal"
              data-testid="settings-submit-method"
              :disabled="submitUrl === ''"
            >
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
            </select>
          </label>
        </div>

        <div class="grid grid-cols-2 gap-3 border-t border-gray-100 pt-3">
          <label class="flex flex-col gap-1 text-xs font-medium text-gray-600">
            {{ t('settings.primaryColor') }}
            <input
              v-model="primaryColor"
              type="color"
              class="h-9 w-full cursor-pointer rounded border border-gray-300"
              data-testid="settings-primary-color"
            >
          </label>
          <label class="flex flex-col gap-1 text-xs font-medium text-gray-600">
            {{ t('settings.radius') }}
            <input
              v-model="radius"
              type="text"
              placeholder="6px"
              class="rounded border border-gray-300 px-2 py-1.5 text-sm font-normal"
              data-testid="settings-radius"
            >
          </label>
        </div>
      </div>
    </div>
  </div>
</template>
