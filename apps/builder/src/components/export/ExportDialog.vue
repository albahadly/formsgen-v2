<script setup lang="ts">
import JSZip from 'jszip'
import { computed, ref, watch } from 'vue'
import CodeBlock from '@/components/ui/CodeBlock.vue'
import { useFocusTrap } from '@/composables/useFocusTrap'
import { getCssAdapter, listCssAdapters, type CssFrameworkId } from '@/export/css'
import { withProject } from '@/export/project'
import { sampleServerFiles } from '@/export/submitServer'
import { getTarget, listTargets, type ExportAssets, type ExportedFile } from '@/export/targets'
import { t, tText } from '@/i18n'
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

/** Code exports carry the project (so Open can read them back) unless turned off. */
const includeProject = ref(true)
const isCode = computed(() => targetId.value !== 'json')
/** Adds the sample submission server (server/) to code exports. */
const includeServer = ref(false)
const serverFiles = computed<ExportedFile[]>(() => (isCode.value && includeServer.value ? sampleServerFiles(builder.schema) : []))

// The web-component target ships the renderer's element bundle, fetched from
// this origin (served under element/) once that target is picked.
const elementScript = ref<string | null>(null)
const elementScriptUrl = typeof document !== 'undefined' ? new URL('element/formsgen-element.js', document.baseURI).href : null
watch(
  targetId,
  async (id) => {
    if (id !== 'web-component' || elementScript.value !== null || typeof fetch !== 'function' || !elementScriptUrl) return
    try {
      const response = await fetch(elementScriptUrl)
      if (response.ok) elementScript.value = await response.text()
    } catch {
      // Not served here: the README says where the script comes from.
    }
  },
  { immediate: true },
)
const assets = computed<ExportAssets>(() => ({ elementScript: elementScript.value, elementScriptUrl }))

const files = computed<ExportedFile[]>(() => {
  const generated = target.value.generate({ schema: builder.schema, css: getCssAdapter(framework.value), assets: assets.value })
  return isCode.value && includeProject.value ? withProject(generated, builder.schema) : generated
})

const projectFile = computed(() => `${builder.schema.meta.name}.formsgen.json`)

const readme = computed(() => {
  const base = target.value.readme({ schema: builder.schema, css: getCssAdapter(framework.value), assets: assets.value })
  return isCode.value
    ? `${base.trimEnd()}\n\n## Change this form later\n\nOpen \`${projectFile.value}\` (or this ZIP${includeProject.value ? ', or the generated file' : ''}) in the FormsGen builder with *Open*, edit it, and export again. Exporting again replaces the generated files, so keep your own code outside them.\n`
    : base
})

/** Generated files plus the README as a viewable tab. */
const viewFiles = computed<ExportedFile[]>(() => [
  ...files.value,
  { path: 'README.md', content: readme.value, language: 'markdown' },
  ...serverFiles.value,
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
  // The project file, so the ZIP can be reopened and edited.
  if (isCode.value) zip.file(projectFile.value, `${JSON.stringify(builder.schema, null, 2)}\n`)
  zip.file('README.md', readme.value)
  for (const file of serverFiles.value) zip.file(file.path, file.content)
  const blob = await zip.generateAsync({ type: 'blob' })
  downloadBlob(blob, `${builder.schema.meta.name}-${target.value.id}.zip`)
}
</script>

<template>
  <div
    v-if="ui.showExport"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60 p-4"
    data-testid="export-dialog"
    @click.self="ui.closeExport()"
  >
    <div
      ref="dialogRef"
      class="flex h-[80vh] w-full max-w-4xl flex-col rounded-lg bg-white dark:bg-gray-900 shadow-xl"
      role="dialog"
      aria-modal="true"
      :aria-label="t('export.title')"
      @keydown.escape="ui.closeExport()"
    >
      <div class="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-4 py-2.5">
        <h2 class="text-sm font-semibold text-gray-800 dark:text-gray-200">
          {{ t('export.title') }}
        </h2>
        <button
          type="button"
          class="rounded px-2 py-1 text-sm text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300"
          data-testid="export-close"
          :aria-label="t('export.close')"
          @click="ui.closeExport()"
        >
          ✕
        </button>
      </div>

      <div class="flex flex-wrap items-center gap-2 border-b border-gray-100 dark:border-gray-800 px-4 py-2">
        <div
          class="flex max-w-full overflow-x-auto rounded-md bg-gray-100 dark:bg-gray-800 p-0.5"
          role="tablist"
        >
          <button
            v-for="candidate in listTargets()"
            :key="candidate.id"
            type="button"
            role="tab"
            class="shrink-0 whitespace-nowrap rounded px-2.5 py-1 text-xs font-medium"
            :class="targetId === candidate.id ? 'bg-white dark:bg-gray-900 text-indigo-700 dark:text-indigo-300 shadow-sm' : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'"
            :aria-selected="targetId === candidate.id"
            :title="tText(candidate.description)"
            :data-testid="`export-target-${candidate.id}`"
            @click="targetId = candidate.id"
          >
            {{ tText(candidate.label) }}
          </button>
        </div>

        <select
          v-if="target.frameworkAware"
          v-model="framework"
          class="rounded border border-gray-300 dark:border-gray-600 px-2 py-1 text-xs"
          data-testid="export-framework"
          :aria-label="t('export.framework')"
        >
          <option
            v-for="adapter in listCssAdapters()"
            :key="adapter.id"
            :value="adapter.id"
          >
            {{ tText(adapter.label) }}
          </option>
        </select>

        <label
          v-if="isCode"
          class="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300"
          :title="t('export.includeProject.hint')"
        >
          <input
            v-model="includeProject"
            type="checkbox"
            class="h-3.5 w-3.5 accent-indigo-600"
            data-testid="export-include-project"
          >
          {{ t('export.includeProject') }}
        </label>
        <label
          v-if="isCode"
          class="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300"
          :title="t('export.includeServer.hint')"
        >
          <input
            v-model="includeServer"
            type="checkbox"
            class="h-3.5 w-3.5 accent-indigo-600"
            data-testid="export-include-server"
          >
          {{ t('export.includeServer') }}
        </label>

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
        class="flex gap-1 border-b border-gray-100 dark:border-gray-800 px-4 py-1.5"
      >
        <button
          v-for="(file, index) in viewFiles"
          :key="file.path"
          type="button"
          dir="ltr"
          class="rounded px-2 py-0.5 font-mono text-[11px]"
          :class="index === activeFileIndex ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'"
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
