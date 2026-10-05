<script setup lang="ts">
import { RENDERER_VERSION } from '@formsgen/renderer'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import WorkArea from '@/components/canvas/WorkArea.vue'
import PalettePanel from '@/components/palette/PalettePanel.vue'
import PropertiesPanel from '@/components/panel/PropertiesPanel.vue'
import { defineAsyncComponent } from 'vue'
import SettingsDialog from '@/components/settings/SettingsDialog.vue'
import TemplatesDialog from '@/components/toolbar/TemplatesDialog.vue'

// Lazy: pulls in jszip + highlight.js only when first opened.
const ExportDialog = defineAsyncComponent(
  () => import('@/components/export/ExportDialog.vue'),
)
import AppToolbar from '@/components/toolbar/AppToolbar.vue'
import TreePanel from '@/components/tree/TreePanel.vue'
import { clearDraft, readDraft, startAutosave } from '@/composables/persistence'
import { applyLocaleToDocument, t, toggleLocale } from '@/i18n'
import { useBuilderStore } from '@/stores/builder'
import { startConditionPathTracking } from '@/stores/conditionPaths'
import { useHistoryStore } from '@/stores/history'
import { useUiStore, type MobilePanel } from '@/stores/ui'
import { storeToRefs } from 'pinia'

const builder = useBuilderStore()
const history = useHistoryStore()

const showTree = ref(false)

// Phones (narrower than 768px): one panel at a time, picked in a bottom tab bar.
const ui = useUiStore()
const { narrow, mobilePanel } = storeToRefs(ui)
const narrowQuery = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(max-width: 767px)') : null
ui.narrow = narrowQuery?.matches ?? false
const onNarrowChange = (event: MediaQueryListEvent): void => {
  ui.narrow = event.matches
}
const mobileTabs: { id: MobilePanel; label: string; icon: string }[] = [
  { id: 'palette', label: 'palette.title', icon: '＋' },
  { id: 'tree', label: 'tree.title', icon: '☰' },
  { id: 'canvas', label: 'mobile.form', icon: '▤' },
  { id: 'properties', label: 'properties.title', icon: '⚙' },
]
/** Is a side panel shown: on phones the picked one, else as on desktop. */
const panelShown = (panel: MobilePanel, desktop: boolean): boolean => (narrow.value ? mobilePanel.value === panel : desktop)
// Adding an element (from the palette) shows it on the form.
watch(
  () => builder.selectedId,
  (id, before) => {
    if (narrow.value && id && id !== before && mobilePanel.value === 'palette') mobilePanel.value = 'canvas'
  },
)
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
startConditionPathTracking()
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

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  narrowQuery?.addEventListener('change', onNarrowChange)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  narrowQuery?.removeEventListener('change', onNarrowChange)
})
</script>

<template>
  <div class="flex h-screen flex-col bg-gray-100 text-gray-900">
    <header class="flex items-center justify-between gap-3 border-b border-gray-200 bg-white px-3 py-2 shadow-sm md:px-4">
      <h1 class="shrink-0 text-base font-semibold md:text-lg">
        {{ t('app.title') }}
      </h1>
      <!-- On phones the buttons scroll sideways instead of overflowing the page. -->
      <div
        class="flex min-w-0 items-center gap-3 overflow-x-auto [&>*]:shrink-0 [&_button]:whitespace-nowrap"
        data-testid="header-actions"
      >
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
          v-if="!narrow"
          type="button"
          class="rounded border px-2 py-1 text-xs font-medium"
          :class="showTree ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'"
          data-testid="tree-toggle"
          :aria-pressed="showTree"
          @click="showTree = !showTree"
        >
          {{ t('tree.title') }}
        </button>
        <span class="hidden shrink-0 text-xs text-gray-500 lg:inline">renderer v{{ RENDERER_VERSION }}</span>
      </div>
    </header>
    <main class="flex flex-1 overflow-hidden">
      <aside
        v-show="panelShown('palette', true)"
        class="shrink-0 overflow-y-auto border-e border-gray-200 bg-white p-3"
        :class="narrow ? 'w-full' : 'w-64'"
        :aria-label="t('palette.title')"
      >
        <PalettePanel />
      </aside>
      <aside
        v-if="panelShown('tree', showTree)"
        class="shrink-0 overflow-y-auto border-e border-gray-200 bg-white p-3"
        :class="narrow ? 'w-full' : 'w-56'"
        :aria-label="t('tree.title')"
      >
        <TreePanel />
      </aside>
      <section
        v-show="panelShown('canvas', true)"
        class="min-w-0 flex-1 overflow-hidden"
        :aria-label="t('toolbar.view.editor')"
      >
        <WorkArea />
      </section>
      <aside
        v-show="panelShown('properties', true)"
        class="shrink-0 overflow-y-auto border-s border-gray-200 bg-white p-3"
        :class="narrow ? 'w-full' : 'w-80'"
        :aria-label="t('properties.title')"
      >
        <PropertiesPanel />
      </aside>
    </main>
    <nav
      v-if="narrow"
      class="grid shrink-0 grid-cols-4 border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)]"
      :aria-label="t('mobile.panels')"
      data-testid="mobile-tabs"
    >
      <button
        v-for="tab in mobileTabs"
        :key="tab.id"
        type="button"
        class="flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium"
        :class="mobilePanel === tab.id ? 'text-indigo-700' : 'text-gray-500'"
        :aria-pressed="mobilePanel === tab.id"
        :data-testid="`mobile-tab-${tab.id}`"
        @click="mobilePanel = tab.id"
      >
        <span
          class="text-base leading-none"
          aria-hidden="true"
        >{{ tab.icon }}</span>
        {{ t(tab.label) }}
      </button>
    </nav>

    <div
      v-if="showDraftToast"
      class="fixed start-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-lg bg-gray-900 px-4 py-2.5 text-sm text-white shadow-lg rtl:translate-x-1/2"
      data-testid="draft-toast"
      :class="narrow ? 'bottom-20' : 'bottom-4'"
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
    <TemplatesDialog />
    <ExportDialog />

    <div
      v-if="notice"
      class="fixed end-4 z-50 rounded-lg bg-red-600 px-4 py-2.5 text-sm text-white shadow-lg"
      data-testid="notice-toast"
      :class="narrow ? 'bottom-20' : 'bottom-4'"
      role="alert"
    >
      {{ notice }}
    </div>
  </div>
</template>
