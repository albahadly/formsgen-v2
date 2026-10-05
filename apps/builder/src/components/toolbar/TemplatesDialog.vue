<script setup lang="ts">
// Starter templates: pick one to replace the current form (asks first when
// the form already has elements). Templates follow the builder's language.
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
      class="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-5 shadow-xl"
      role="dialog"
      aria-modal="true"
      :aria-label="t('templates.title')"
    >
      <div class="mb-4 flex items-center justify-between">
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
      <p class="mb-3 text-xs text-gray-500">
        {{ t('templates.hint') }}
      </p>
      <ul class="flex flex-col gap-2">
        <li
          v-for="template in templates"
          :key="template.id"
        >
          <button
            type="button"
            class="w-full rounded-lg border border-gray-200 p-3 text-start hover:border-indigo-400 hover:bg-indigo-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500"
            :data-testid="`template-${template.id}`"
            @click="use(template)"
          >
            <span class="block text-sm font-semibold text-gray-800">{{ template.title }}</span>
            <span class="block text-xs text-gray-500">{{ template.description }}</span>
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>
