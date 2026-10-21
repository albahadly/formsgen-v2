<script setup lang="ts">
import { FormsGenForm, afterSubmitOf, describeFiles, fill, memoryStorage, pinsLightScheme, queryPrefill } from '@albahadly/formsgen-renderer'
import { computed, ref, watch } from 'vue'
import { t } from '@/i18n'
import { useBuilderStore } from '@/stores/builder'
import { useUiStore } from '@/stores/ui'

const builder = useBuilderStore()
const ui = useUiStore()

const formData = ref<Record<string, unknown>>({})
const submitted = ref<Record<string, unknown> | null>(null)
// "Save and continue later" keeps preview answers in memory only (never the builder's localStorage).
const previewDrafts = memoryStorage()

// Prefill from the page address: the preview has no address of its own, so
// it tests with a string typed here (shown when the form reads one).
const query = ref('')
const readsQuery = computed(
  () => builder.schema.meta.prefillFromQuery === true || queryPrefill(builder.schema.tree, '?', { fields: false }).length > 0 || hasParam(builder.schema.tree),
)
function hasParam(nodes: typeof builder.schema.tree): boolean {
  return nodes.some((n) => (n.type === 'hidden' && typeof n.props['param'] === 'string' && n.props['param'] !== '') || (n.children ? hasParam(n.children) : false))
}

// Remount the form when the schema changes so defaults re-apply cleanly.
const formKey = computed(() => JSON.stringify(builder.schema.tree).length + ui.previewTheme + query.value)
watch(formKey, again)

// After submit: the thank-you replaces the preview form; a redirect is only announced.
const sent = ref(false)
const redirectNote = ref<string | null>(null)
function onSubmit(data: Record<string, unknown>): void {
  submitted.value = data
  const after = afterSubmitOf(builder.schema)
  if (after.redirectUrl) redirectNote.value = after.redirectUrl
  else if (after.message) sent.value = true
}
function again(): void {
  sent.value = false
  submitted.value = null
  redirectNote.value = null
}

// Files show as { name, size, type } (JSON.stringify would print {}).
const submittedJson = computed(() =>
  submitted.value ? JSON.stringify(describeFiles(submitted.value).data, null, 2) : '',
)
</script>

<template>
  <div
    class="h-full overflow-y-auto p-6"
    data-testid="panel-preview"
  >
    <div
      class="mx-auto flex flex-col gap-4 transition-all"
      :style="{ maxWidth: ui.deviceWidth }"
    >
      <label
        v-if="readsQuery"
        class="flex flex-col gap-1 text-xs font-medium text-gray-600 dark:text-gray-300"
      >
        {{ t('preview.query') }}
        <input
          v-model="query"
          type="text"
          dir="ltr"
          class="rounded border border-gray-300 px-2 py-1.5 font-mono text-xs font-normal text-gray-900 dark:border-gray-600 dark:text-gray-100"
          :placeholder="t('preview.queryHint')"
          data-testid="preview-query"
        >
      </label>
      <FormsGenForm
        :key="formKey"
        v-model="formData"
        class="rounded-lg p-6 shadow-sm"
        :schema="builder.schema"
        :draft-storage="previewDrafts"
        captcha-preview
        :prefill-search="readsQuery ? `?${query}` : null"
        :sent="sent"
        :data-fg-theme="pinsLightScheme(builder.schema.meta.theme) ? 'light' : ui.previewTheme"
        :viewport="ui.device === 'mobile' ? 'sm' : ui.device === 'tablet' ? 'md' : undefined"
        @submit="onSubmit"
        @again="again"
      />
      <p
        v-if="redirectNote"
        class="rounded-lg bg-indigo-50 dark:bg-indigo-950 px-4 py-2 text-xs text-indigo-700 dark:text-indigo-300"
        data-testid="preview-redirect-note"
      >
        {{ fill(t('preview.wouldRedirect'), { url: redirectNote }) }}
      </p>
      <div
        v-if="submitted"
        class="rounded-lg bg-gray-900 p-4 text-xs text-green-300"
        data-testid="preview-submitted"
      >
        <p class="mb-2 font-semibold text-gray-300">
          {{ t('preview.submitted') }}
        </p>
        <pre
          dir="ltr"
          class="overflow-x-auto text-left"
        >{{ submittedJson }}</pre>
      </div>
    </div>
  </div>
</template>
