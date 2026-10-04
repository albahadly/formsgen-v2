<script setup lang="ts">
import { KNOWN_RULE_NAMES, type ElementNode, type Rule, type RuleName } from '@formsgen/renderer'
import { computed, ref } from 'vue'
import { t } from '@/i18n'
import { useBuilderStore } from '@/stores/builder'

const props = defineProps<{ node: ElementNode }>()

const store = useBuilderStore()
const pendingRule = ref('')

const rules = computed<Rule[]>(() => props.node.validation ?? [])

const available = computed(() =>
  [...KNOWN_RULE_NAMES].filter((name) => !rules.value.some((r) => r.rule === name)),
)

function write(next: Rule[]): void {
  store.setValidation(props.node.id, next)
}

function addRule(): void {
  if (pendingRule.value === '') return
  const rule = pendingRule.value as RuleName
  const withDefault: Rule =
    rule === 'min' || rule === 'max'
      ? { rule, value: 1 }
      : rule === 'between'
        ? { rule, value: [1, 10] }
        : rule === 'regex' || rule === 'same-as'
          ? { rule, value: '' }
          : { rule }
  write([...rules.value, withDefault])
  pendingRule.value = ''
}

function removeRule(index: number): void {
  write(rules.value.filter((_, i) => i !== index))
}

function setRuleValue(index: number, value: unknown): void {
  write(rules.value.map((r, i) => (i === index ? { ...r, value } : r)))
}

function setBetweenBound(index: number, bound: 0 | 1, raw: string): void {
  const current = rules.value[index]?.value
  const pair: [number, number] = Array.isArray(current)
    ? [Number(current[0]), Number(current[1])]
    : [1, 10]
  pair[bound] = Number(raw)
  setRuleValue(index, pair)
}

function needsNumber(rule: Rule): boolean {
  return rule.rule === 'min' || rule.rule === 'max'
}

function needsText(rule: Rule): boolean {
  return rule.rule === 'regex' || rule.rule === 'same-as'
}

function betweenValue(rule: Rule, bound: 0 | 1): number {
  return Array.isArray(rule.value) ? Number(rule.value[bound]) : bound === 0 ? 1 : 10
}
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <div
      v-for="(rule, index) in rules"
      :key="rule.rule"
      class="flex items-center gap-1.5 rounded border border-gray-200 bg-gray-50 px-2 py-1"
      :data-testid="`rule-${rule.rule}`"
    >
      <span class="flex-1 text-xs font-medium text-gray-700">{{ rule.rule }}</span>
      <input
        v-if="needsNumber(rule)"
        type="number"
        class="w-16 rounded border border-gray-300 px-1.5 py-0.5 text-xs"
        :value="Number(rule.value ?? 0)"
        @input="setRuleValue(index, Number(($event.target as HTMLInputElement).value))"
      >
      <template v-else-if="rule.rule === 'between'">
        <input
          type="number"
          class="w-14 rounded border border-gray-300 px-1.5 py-0.5 text-xs"
          :value="betweenValue(rule, 0)"
          @input="setBetweenBound(index, 0, ($event.target as HTMLInputElement).value)"
        >
        <span class="text-xs text-gray-400">–</span>
        <input
          type="number"
          class="w-14 rounded border border-gray-300 px-1.5 py-0.5 text-xs"
          :value="betweenValue(rule, 1)"
          @input="setBetweenBound(index, 1, ($event.target as HTMLInputElement).value)"
        >
      </template>
      <input
        v-else-if="needsText(rule)"
        type="text"
        class="w-28 rounded border border-gray-300 px-1.5 py-0.5 font-mono text-xs"
        :value="String(rule.value ?? '')"
        @input="setRuleValue(index, ($event.target as HTMLInputElement).value)"
      >
      <button
        type="button"
        class="rounded px-1 text-xs text-red-500 hover:bg-red-50"
        :aria-label="t('properties.validation.remove')"
        :data-testid="`rule-remove-${rule.rule}`"
        @click="removeRule(index)"
      >
        ✕
      </button>
    </div>
    <div class="flex gap-1.5">
      <select
        v-model="pendingRule"
        class="flex-1 rounded border border-gray-300 px-2 py-1 text-xs"
        data-testid="rule-add-select"
      >
        <option value="">
          {{ t('properties.validation.add') }}
        </option>
        <option
          v-for="name in available"
          :key="name"
          :value="name"
        >
          {{ name }}
        </option>
      </select>
      <button
        type="button"
        class="rounded bg-indigo-600 px-2 py-1 text-xs font-medium text-white disabled:opacity-40"
        :disabled="pendingRule === ''"
        data-testid="rule-add-button"
        @click="addRule"
      >
        +
      </button>
    </div>
  </div>
</template>
