<script setup lang="ts">
import JSZip from 'jszip'
import { computed, ref, watch } from 'vue'
import CodeBlock from '@/components/ui/CodeBlock.vue'
import { useFocusTrap } from '@/composables/useFocusTrap'
import { getCssAdapter, listCssAdapters, type CssFrameworkId } from '@/export/css'
import { getTarget, listTargets, type ExportedFile } from '@/export/targets'
import { t } from '@/i18n'
import { useBuilderStore } from '@/stores/builder'
import { useUiStore } from '@/stores/ui'

const builder = useBuilderStore()
const ui = useUiStore()

const dialogRef = ref<HTMLElement | null>(null)
useFocusTrap(
  dialogRef,
  computed(() => ui.showExport),
)

const targetId = ref('json')
const framework = ref<CssFrameworkId>('vanilla')
const activeFileIndex = ref(0)
const copied = ref(false)

const target = computed(() => getTarget(targetId.value)!)

const files = computed<ExportedFile[]>(() =>
  target.value.generate({ schema: builder.schema, css: getCssAdapter(framework.value) }),
)

const readme = computed(() =>
  target.value.readme({ schema: builder.schema, css: getCssAdapter(framework.value) }),
)

/** Generated files plus the README as a viewable tab. */
const viewFiles = computed<ExportedFile[]>(() => [
  ...files.value,
  { path: 'README.md', content: readme.value, language: 'markdown' },
])

const activeFile = computed(
  () => viewFiles.value[Math.min(activeFileIndex.value, viewFiles.value.length - 1)]!,
)

watch([targetId, framework], () => {
  activeFileIndex.value = 0
})

async function copy(): Promise<void> {
  try {
    await navigator.clipboard.writeText(activeFile.value.content)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 1500)
  } catch {
    // clipboard unavailable — ignore
  }
}

function downloadBlob(blob: Blob, filename: string): void {
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  link.click()
  URL.revokeObjectURL(link.href)
}

function downloadFile(): void {
  const file = files.value[0]!
  downloadBlob(new Blob([file.content], { type: 'text/plain' }), file.path)
}

async function downloadZip(): Promise<void> {
  const zip = new JSZip()
  for (const file of files.value) zip.file(file.path, file.content)
  zip.file('README.md', readme.value)
  const blob = await zip.generateAsync({ type: 'blob' })
  downloadBlob(blob, `${builder.schema.meta.name}-${target.value.id}.zip`)
}
</script>

<template>
  <div
    v-if="ui.showExport"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    data-testid="export-dialog"
    @click.self="ui.closeExport()"
  >
    <div
      ref="dialogRef"
      class="flex h-[80vh] w-full max-w-4xl flex-col rounded-lg bg-white shadow-xl"
      role="dialog"
      aria-modal="true"
      :aria-label="t('export.title')"
      @keydown.escape="ui.closeExport()"
    >
      <div class="flex items-center justify-between border-b border-gray-200 px-4 py-2.5">
        <h2 class="text-sm font-semibold text-gray-800">
          {{ t('export.title') }}
        </h2>
        <button
          type="button"
          class="rounded px-2 py-1 text-sm text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          data-testid="export-close"
          :aria-label="t('export.close')"
          @click="ui.closeExport()"
        >
          ✕
        </button>
      </div>

      <div class="flex flex-wrap items-center gap-2 border-b border-gray-100 px-4 py-2">
        <div
          class="flex rounded-md bg-gray-100 p-0.5"
          role="tablist"
        >
          <button
            v-for="candidate in listTargets()"
            :key="candidate.id"
            type="button"
            role="tab"
            class="rounded px-2.5 py-1 text-xs font-medium"
            :class="targetId === candidate.id ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'"
            :aria-selected="targetId === candidate.id"
            :title="candidate.description"
            :data-testid="`export-target-${candidate.id}`"
            @click="targetId = candidate.id"
          >
            {{ candidate.label }}
          </button>
        </div>

        <select
          v-if="target.frameworkAware"
          v-model="framework"
          class="rounded border border-gray-300 px-2 py-1 text-xs"
          data-testid="export-framework"
          :aria-label="t('export.framework')"
        >
          <option
            v-for="adapter in listCssAdapters()"
            :key="adapter.id"
            :value="adapter.id"
          >
            {{ adapter.label }}
          </option>
        </select>

        <span class="flex-1" />

        <button
          type="button"
          class="rounded bg-gray-700 px-2.5 py-1 text-xs font-medium text-white hover:bg-gray-600"
          data-testid="export-copy"
          @click="copy"
        >
          {{ copied ? t('code.copied') : t('code.copy') }}
        </button>
        <button
          type="button"
          class="rounded bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-indigo-500"
          data-testid="export-download"
          @click="downloadFile"
        >
          {{ t('export.download') }}
        </button>
        <button
          type="button"
          class="rounded bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-indigo-500"
          data-testid="export-download-zip"
          :title="t('export.zip.hint')"
          @click="downloadZip"
        >
          {{ t('export.zip') }}
        </button>
      </div>

      <div
        v-if="viewFiles.length > 1"
        class="flex gap-1 border-b border-gray-100 px-4 py-1.5"
      >
        <button
          v-for="(file, index) in viewFiles"
          :key="file.path"
          type="button"
          class="rounded px-2 py-0.5 font-mono text-[11px]"
          :class="index === activeFileIndex ? 'bg-indigo-50 text-indigo-700' : 'text-gray-500 hover:bg-gray-100'"
          :data-testid="`export-file-${file.path}`"
          @click="activeFileIndex = index"
        >
          {{ file.path }}
        </button>
      </div>

      <div class="min-h-0 flex-1 p-3">
        <CodeBlock
          :code="activeFile.content"
          :language="activeFile.language"
          data-testid="export-code"
        />
      </div>
    </div>
  </div>
</template>
