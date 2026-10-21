<script setup lang="ts">
// Country picker for a phone field's default country: names come from
// Intl in the builder's UI language, so no per-country translations.
import { COUNTRY_DIAL_CODES, countryName, type ElementNode } from '@formsgen/renderer'
import { computed } from 'vue'
import { locale, tText } from '@/i18n'
import { useBuilderStore } from '@/stores/builder'

const props = defineProps<{
  node: ElementNode
  prop: string
  label: string
}>()

const store = useBuilderStore()
const countries = computed(() => {
  const collator = new Intl.Collator(locale.value)
  return Object.entries(COUNTRY_DIAL_CODES)
    .map(([code, dial]) => ({ code, label: `${countryName(code, locale.value)} (+${dial})` }))
    .sort((a, b) => collator.compare(a.label, b.label))
})
const value = computed({
  get: () => String(props.node.props[props.prop] ?? ''),
  set: (v: string) => store.updateProps(props.node.id, { [props.prop]: v }),
})
</script>

<template>
  <label class="flex flex-col gap-1 text-xs font-medium text-gray-600 dark:text-gray-300">
    {{ tText(label) }}
    <select
      v-model="value"
      class="rounded border border-gray-300 dark:border-gray-600 px-2 py-1.5 text-sm font-normal text-gray-900 dark:text-gray-100"
      :data-testid="`control-${prop}`"
    >
      <option
        v-for="country in countries"
        :key="country.code"
        :value="country.code"
      >
        {{ country.label }}
      </option>
    </select>
  </label>
</template>
