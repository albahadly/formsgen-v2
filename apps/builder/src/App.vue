<script setup lang="ts">
import { RENDERER_VERSION } from '@formsgen/renderer'
import { onBeforeUnmount, onMounted, ref } from 'vue'
import WorkArea from '@/components/canvas/WorkArea.vue'
import PalettePanel from '@/components/palette/PalettePanel.vue'
import PropertiesPanel from '@/components/panel/PropertiesPanel.vue'
import { defineAsyncComponent } from 'vue'
import SettingsDialog from '@/components/settings/SettingsDialog.vue'

// Lazy: pulls in jszip + highlight.js only when first opened.
const ExportDialog = defineAsyncComponent(
  () => import('@/components/export/ExportDialog.vue'),
)
import AppToolbar from '@/components/toolbar/AppToolbar.vue'
import TreePanel from '@/components/tree/TreePanel.vue'
import { clearDraft, readDraft, startAutosave } from '@/composables/persistence'
import { applyLocaleToDocument, t, toggleLocale } from '@/i18n'
import { useBuilderStore } from '@/stores/builder'
import { useHistoryStore } from '@/stores/history'

const builder = useBuilderStore()
const history = useHistoryStore()

const showTree = ref(false)
const notice = ref<string | null>(null)
const showDraftToast = ref(false)

// Restore an unsaved draft BEFORE history starts, so the baseline is the
// restored state and undo cannot cross into the pre-restore void.
const draft = readDraft()
if (draft) {
  builder.loadSchema(draft)
  showDraftToast.value = true
}
history.start()
startAutosave()
applyLocaleToDocument()

function startFresh(): void {
  builder.reset()
  history.reset()
  clearDraft()
  showDraftToast.value = false
}

function onNotice(message: string): void {
  notice.value = message
  setTimeout(() => {
    notice.value = null
  }, 5000)
}

function onKeydown(event: KeyboardEvent): void {
  const target = event.target as HTMLElement
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
    event.preventDefault()
    if (event.shiftKey) {
      history.redo()
    } else {
      history.undo()
    }
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div class="flex h-screen flex-col bg-gray-100 text-gray-900">
    <header class="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-2 shadow-sm">
      <h1 class="text-lg font-semibold">
        {{ t('app.title') }}
      </h1>
      <div class="flex items-center gap-3">
        <AppToolbar @notice="onNotice" />
        <button
          type="button"
          class="rounded border border-gray-300 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
          data-testid="locale-toggle"
          @click="toggleLocale()"
        >
          {{ t('app.language') }}
        </button>
        <button
          type="button"
          class="rounded border px-2 py-1 text-xs font-medium"
          :class="showTree ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'"
          data-testid="tree-toggle"
          :aria-pressed="showTree"
          @click="showTree = !showTree"
        >
          {{ t('tree.title') }}
        </button>
        <span class="text-xs text-gray-500">renderer v{{ RENDERER_VERSION }}</span>
      </div>
    </header>
    <main class="flex flex-1 overflow-hidden">
      <aside
        class="w-64 shrink-0 overflow-y-auto border-e border-gray-200 bg-white p-3"
        :aria-label="t('palette.title')"
      >
        <PalettePanel />
      </aside>
      <aside
        v-if="showTree"
        class="w-56 shrink-0 overflow-y-auto border-e border-gray-200 bg-white p-3"
        :aria-label="t('tree.title')"
      >
        <TreePanel />
      </aside>
      <section
        class="flex-1 overflow-hidden"
        :aria-label="t('toolbar.view.editor')"
      >
        <WorkArea />
      </section>
      <aside
        class="w-80 shrink-0 overflow-y-auto border-s border-gray-200 bg-white p-3"
        :aria-label="t('properties.title')"
      >
        <PropertiesPanel />
      </aside>
    </main>

    <div
      v-if="showDraftToast"
      class="fixed bottom-4 start-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-lg bg-gray-900 px-4 py-2.5 text-sm text-white shadow-lg rtl:translate-x-1/2"
      data-testid="draft-toast"
      role="status"
    >
      {{ t('draft.restored') }}
      <button
        type="button"
        class="rounded bg-gray-700 px-2 py-1 text-xs font-medium hover:bg-gray-600"
        data-testid="draft-start-fresh"
        @click="startFresh"
      >
        {{ t('draft.startFresh') }}
      </button>
      <button
        type="button"
        class="rounded bg-indigo-500 px-2 py-1 text-xs font-medium hover:bg-indigo-400"
        data-testid="draft-keep"
        @click="showDraftToast = false"
      >
        {{ t('draft.dismiss') }}
      </button>
    </div>

    <SettingsDialog />
    <ExportDialog />

    <div
      v-if="notice"
      class="fixed bottom-4 end-4 z-50 rounded-lg bg-red-600 px-4 py-2.5 text-sm text-white shadow-lg"
      data-testid="notice-toast"
      role="alert"
    >
      {{ notice }}
    </div>
  </div>
</template>
