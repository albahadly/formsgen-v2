<script setup lang="ts">
import { FormsGenForm, pinsLightScheme } from '@formsgen/renderer'
import { computed, ref } from 'vue'
import { t } from '@/i18n'
import { useBuilderStore } from '@/stores/builder'
import { useUiStore } from '@/stores/ui'

const builder = useBuilderStore()
const ui = useUiStore()

const formData = ref<Record<string, unknown>>({})
const submitted = ref<Record<string, unknown> | null>(null)

// Remount the form when the schema changes so defaults re-apply cleanly.
const formKey = computed(() => JSON.stringify(builder.schema.tree).length + ui.previewTheme)

function onSubmit(data: Record<string, unknown>): void {
  submitted.value = data
}
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
      <FormsGenForm
        :key="formKey"
        v-model="formData"
        class="rounded-lg p-6 shadow-sm"
        :schema="builder.schema"
        :data-fg-theme="pinsLightScheme(builder.schema.meta.theme) ? 'light' : ui.previewTheme"
        @submit="onSubmit"
      />
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
        >{{ JSON.stringify(submitted, null, 2) }}</pre>
      </div>
    </div>
  </div>
</template>
