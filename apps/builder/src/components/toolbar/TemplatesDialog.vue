<script setup lang="ts">
// Examples and starter templates: choose one from the dropdown to see it
// rendered live, then "Use this example" replaces the current form (asking
// first when the form already has elements). Examples follow the builder's
// language; together they use every element type.
import { FormsGenForm } from '@formsgen/renderer'
import { computed, ref } from 'vue'
import { useFocusTrap } from '@/composables/useFocusTrap'
import { locale, t } from '@/i18n'
import { useBuilderStore } from '@/stores/builder'
import { useHistoryStore } from '@/stores/history'
import { useUiStore } from '@/stores/ui'
import { listTemplates, type FormTemplate } from '@/templates'

const builder = useBuilderStore()
const history = useHistoryStore()
const ui = useUiStore()

const dialogRef = ref<HTMLElement | null>(null)
useFocusTrap(
  dialogRef,
  computed(() => ui.showTemplates),
)

const templates = computed(() => listTemplates(locale.value))
const selectedId = ref<FormTemplate['id']>('contact')
const selected = computed(() => templates.value.find((tpl) => tpl.id === selectedId.value) ?? templates.value[0]!)

// The preview is a scratch form: its data is never kept.
const previewData = ref<Record<string, unknown>>({})

function use(template: FormTemplate): void {
  if (builder.schema.tree.length > 0 && !window.confirm(t('templates.replace'))) return
  builder.loadSchema(structuredClone(template.schema))
  history.reset()
  ui.closeTemplates()
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') ui.closeTemplates()
}
</script>

<template>
  <div
    v-if="ui.showTemplates"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    data-testid="templates-dialog"
    @click.self="ui.closeTemplates()"
    @keydown="onKeydown"
  >
    <div
      ref="dialogRef"
      class="flex max-h-[92vh] w-full max-w-3xl flex-col rounded-lg bg-white shadow-xl"
      role="dialog"
      aria-modal="true"
      :aria-label="t('templates.title')"
    >
      <div class="flex items-center justify-between border-b border-gray-200 px-5 py-3">
        <h2 class="text-sm font-semibold text-gray-800">
          {{ t('templates.title') }}
        </h2>
        <button
          type="button"
          class="rounded px-2 py-1 text-sm text-gray-500 hover:bg-gray-100"
          :aria-label="t('settings.close')"
          @click="ui.closeTemplates()"
        >
          ✕
        </button>
      </div>

      <div class="flex flex-col gap-2 px-5 pt-4">
        <p class="text-xs text-gray-500">
          {{ t('templates.hint') }}
        </p>
        <label class="flex flex-wrap items-center gap-2 text-xs font-medium text-gray-700">
          {{ t('templates.example') }}
          <select
            v-model="selectedId"
            class="min-w-56 flex-1 rounded border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-800 sm:flex-none"
            data-testid="templates-select"
          >
            <option
              v-for="template in templates"
              :key="template.id"
              :value="template.id"
            >
              {{ template.title }}
            </option>
          </select>
        </label>
        <p
          class="text-xs text-gray-600"
          data-testid="templates-description"
        >
          {{ selected.description }}
        </p>
      </div>

      <section
        class="m-5 mt-3 min-h-0 flex-1 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-4"
        :aria-label="t('templates.preview')"
        data-testid="templates-preview"
      >
        <FormsGenForm
          :key="`${locale}-${selected.id}`"
          v-model="previewData"
          class="rounded-lg bg-white p-5 shadow-sm"
          data-fg-theme="light"
          :schema="selected.schema"
          :draft-storage="null"
        />
      </section>

      <div class="flex justify-end gap-2 border-t border-gray-200 px-5 py-3">
        <button
          type="button"
          class="rounded border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
          @click="ui.closeTemplates()"
        >
          {{ t('templates.cancel') }}
        </button>
        <button
          type="button"
          class="rounded bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
          data-testid="template-use"
          @click="use(selected)"
        >
          {{ t('templates.use') }}
        </button>
      </div>
    </div>
  </div>
</template>
