<script setup lang="ts">
// A calculated field's formula: the text, its first problem (checked
// against the whole form as you type) and the fields it may use, which
// insert themselves on click.
import { analyzeFormulas, type ElementNode } from '@formsgen/renderer'
import { computed } from 'vue'
import { formulaSuggestions } from '@/export/calc'
import { t, tText } from '@/i18n'
import { useBuilderStore } from '@/stores/builder'

const props = defineProps<{ node: ElementNode }>()
const store = useBuilderStore()

const formula = computed({
  get: () => String(props.node.props['formula'] ?? ''),
  set: (v: string) => store.updateProps(props.node.id, { formula: v }),
})
const problem = computed(() => (formula.value.trim() === '' ? '' : (analyzeFormulas(store.schema.tree).get(props.node.id)?.problem ?? '')))
const suggestions = computed(() => formulaSuggestions(store.schema.tree, props.node.id))

function insert(snippet: string): void {
  const current = formula.value.trimEnd()
  formula.value = current ? `${current} ${snippet}` : snippet
}
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <label class="flex flex-col gap-1 text-xs font-medium text-gray-600">
      {{ t('formula.label') }}
      <textarea
        v-model="formula"
        rows="2"
        dir="ltr"
        class="rounded border px-2 py-1.5 font-mono text-sm font-normal text-gray-900"
        :class="problem ? 'border-red-400' : 'border-gray-300'"
        placeholder="{nights} * {price}"
        :aria-invalid="problem ? 'true' : undefined"
        aria-describedby="formula-help"
        data-testid="control-formula"
      />
    </label>
    <p
      v-if="problem"
      class="text-[11px] font-medium text-red-600"
      role="alert"
      data-testid="formula-problem"
    >
      {{ t('formula.problem') }} {{ problem }}
    </p>
    <p
      id="formula-help"
      class="text-[11px] text-gray-500"
    >
      {{ t('formula.help') }}
    </p>
    <div
      v-if="suggestions.length"
      class="flex flex-col gap-1"
    >
      <span class="text-[11px] font-medium text-gray-600">{{ t('formula.fields') }}</span>
      <div class="flex flex-wrap gap-1">
        <button
          v-for="s in suggestions"
          :key="s.snippet"
          type="button"
          class="rounded border border-indigo-200 bg-indigo-50 px-1.5 py-0.5 text-[11px] text-indigo-700 hover:bg-indigo-100"
          :title="s.snippet"
          data-testid="formula-insert"
          @click="insert(s.snippet)"
        >
          {{ tText(s.label) }}
        </button>
      </div>
    </div>
  </div>
</template>
