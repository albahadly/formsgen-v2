<script setup lang="ts">
import { ref } from 'vue'
import { openProjectFile } from '@/composables/openProject'
import { t } from '@/i18n'
import { useBuilderStore } from '@/stores/builder'
import { useHistoryStore } from '@/stores/history'
import { useUiStore } from '@/stores/ui'

const emit = defineEmits<{ notice: [message: string] }>()

const builder = useBuilderStore()
const history = useHistoryStore()
const ui = useUiStore()
const fileInput = ref<HTMLInputElement | null>(null)

function saveProject(): void {
  const json = JSON.stringify(builder.schema, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `${builder.schema.meta.name}.formsgen.json`
  link.click()
  URL.revokeObjectURL(link.href)
}

function openPicker(): void {
  fileInput.value?.click()
}

async function onFileChosen(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  // A project file, an export ZIP or an exported code file carrying the project.
  const result = await openProjectFile(file)
  if (!result.ok) {
    emit(
      'notice',
      result.reason === 'invalid'
        ? `${t('toolbar.open.invalid')} ${result.detail ?? ''}`
        : t(result.reason === 'no-project' ? 'toolbar.open.noProject' : 'toolbar.open.unreadable'),
    )
    return
  }
  builder.loadSchema(result.schema)
  history.reset()
}
</script>

<template>
  <div class="flex items-center gap-1.5">
    <button
      type="button"
      class="rounded border border-gray-300 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40"
      :disabled="!history.canUndo"
      data-testid="toolbar-undo"
      :title="t('toolbar.undo')"
      @click="history.undo()"
    >
      ↶ {{ t('toolbar.undo') }}
    </button>
    <button
      type="button"
      class="rounded border border-gray-300 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40"
      :disabled="!history.canRedo"
      data-testid="toolbar-redo"
      :title="t('toolbar.redo')"
      @click="history.redo()"
    >
      ↷ {{ t('toolbar.redo') }}
    </button>
    <span class="mx-1 h-4 w-px bg-gray-200" />
    <button
      type="button"
      class="rounded border border-gray-300 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
      data-testid="toolbar-templates"
      @click="ui.openTemplates()"
    >
      {{ t('toolbar.templates') }}
    </button>
    <button
      type="button"
      class="rounded border border-gray-300 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
      data-testid="toolbar-open"
      @click="openPicker"
    >
      {{ t('toolbar.open') }}
    </button>
    <button
      type="button"
      class="rounded border border-gray-300 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
      data-testid="toolbar-save"
      @click="saveProject"
    >
      {{ t('toolbar.save') }}
    </button>
    <button
      type="button"
      class="rounded bg-indigo-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-indigo-500"
      data-testid="toolbar-export"
      @click="ui.openExport()"
    >
      {{ t('toolbar.export') }}
    </button>
    <input
      ref="fileInput"
      type="file"
      accept=".json,.zip,.html,.vue,.tsx,.razor,application/json,application/zip"
      class="hidden"
      data-testid="toolbar-file-input"
      @change="onFileChosen"
    >
  </div>
</template>
