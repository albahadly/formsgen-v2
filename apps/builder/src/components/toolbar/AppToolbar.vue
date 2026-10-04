<script setup lang="ts">
import { parseFormSchema } from '@formsgen/renderer'
import { ref } from 'vue'
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
  try {
    const result = parseFormSchema(JSON.parse(await file.text()))
    if (!result.ok) {
      emit('notice', `${t('toolbar.open.invalid')} ${result.errors[0] ?? ''}`)
      return
    }
    builder.loadSchema(result.schema)
    history.reset()
  } catch {
    emit('notice', t('toolbar.open.unreadable'))
  }
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
      accept=".json,application/json"
      class="hidden"
      data-testid="toolbar-file-input"
      @change="onFileChosen"
    >
  </div>
</template>
