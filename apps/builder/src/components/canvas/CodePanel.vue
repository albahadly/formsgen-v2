<script setup lang="ts">
import hljs from 'highlight.js/lib/core'
import jsonLang from 'highlight.js/lib/languages/json'
import { computed, ref } from 'vue'
import { t } from '@/i18n'
import { useBuilderStore } from '@/stores/builder'
import 'highlight.js/styles/github-dark.css'

hljs.registerLanguage('json', jsonLang)

const builder = useBuilderStore()
const copied = ref(false)

const json = computed(() => JSON.stringify(builder.schema, null, 2))
const highlighted = computed(() => hljs.highlight(json.value, { language: 'json' }).value)

async function copy(): Promise<void> {
  try {
    await navigator.clipboard.writeText(json.value)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 1500)
  } catch {
    // clipboard unavailable (permissions/insecure context) — ignore
  }
}
</script>

<template>
  <div
    class="h-full overflow-y-auto p-6"
    data-testid="panel-code"
  >
    <div class="relative mx-auto max-w-3xl">
      <button
        type="button"
        class="absolute end-3 top-3 rounded bg-gray-700 px-2 py-1 text-xs font-medium text-gray-100 hover:bg-gray-600"
        data-testid="code-copy"
        @click="copy"
      >
        {{ copied ? t('code.copied') : t('code.copy') }}
      </button>
      <pre
        class="overflow-x-auto rounded-lg bg-[#0d1117] p-4 text-xs leading-relaxed"
        data-testid="code-json"
      ><!-- eslint-disable vue/no-v-html -- trusted: hljs output of our own serialized schema --><code
        class="hljs language-json"
        v-html="highlighted"
      /><!-- eslint-enable vue/no-v-html --></pre>
    </div>
  </div>
</template>
