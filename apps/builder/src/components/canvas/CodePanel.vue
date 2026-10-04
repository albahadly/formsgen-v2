<script setup lang="ts">
import { computed, ref } from 'vue'
import CodeBlock from '@/components/ui/CodeBlock.vue'
import { t } from '@/i18n'
import { useBuilderStore } from '@/stores/builder'

const builder = useBuilderStore()
const copied = ref(false)

const json = computed(() => JSON.stringify(builder.schema, null, 2))

async function copy(): Promise<void> {
  try {
    await navigator.clipboard.writeText(json.value)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 1500)
  } catch {
    // clipboard unavailable — ignore
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
        class="absolute end-3 top-3 z-10 rounded bg-gray-700 px-2 py-1 text-xs font-medium text-gray-100 hover:bg-gray-600"
        data-testid="code-copy"
        @click="copy"
      >
        {{ copied ? t('code.copied') : t('code.copy') }}
      </button>
      <div data-testid="code-json">
        <CodeBlock
          :code="json"
          language="json"
        />
      </div>
    </div>
  </div>
</template>
