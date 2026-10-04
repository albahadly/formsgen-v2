<script setup lang="ts">
// Country-code select + national number. The value stays one string,
// "+<code> <number>" ("" while no number is typed); the selected country
// is kept separately so it survives an empty number.
import { computed, ref, watch } from 'vue'
import { composePhone, defaultPhoneCountry, phoneCountries, splitPhone } from '../../countries'
import { MESSAGES } from '../../messages'
import type { ElementNode } from '../../schema'
import { useField } from '../useField'

const props = defineProps<{ node: ElementNode; path: string }>()
const { ctx, value, error, label, description, placeholder, required, fieldId, errorId, describedBy, onBlur, labelClass, sizeClass } =
  useField(props)

const messages = computed(() => ctx.messages?.() ?? MESSAGES.en)
const countries = computed(() => phoneCountries(props.node, ctx.locale?.() ?? 'en'))
const current = (): string => (typeof value.value === 'string' ? value.value : '')
const country = ref(splitPhone(current(), countries.value, defaultPhoneCountry(props.node, countries.value)).country)
const dial = (code: string): string => countries.value.find((c) => c.code === code)?.dial ?? ''

const number = computed(() => {
  const v = current()
  const prefix = `+${dial(country.value)} `
  return v.startsWith(prefix) ? v.slice(prefix.length) : v
})

// A value set from outside (v-model) re-selects the matching country.
watch(value, (v) => {
  if (typeof v === 'string' && v.startsWith('+') && !v.startsWith(`+${dial(country.value)} `)) {
    country.value = splitPhone(v, countries.value, country.value).country
  }
})

function setCountry(event: Event): void {
  const typed = number.value
  country.value = (event.target as HTMLSelectElement).value
  value.value = composePhone(dial(country.value), typed)
}

function setNumber(event: Event): void {
  value.value = composePhone(dial(country.value), (event.target as HTMLInputElement).value)
}
</script>

<template>
  <div
    class="fg-field"
    :class="{ 'fg-field--error': error }"
  >
    <label
      :class="labelClass"
      :for="fieldId"
    >
      {{ label }}<span
        v-if="required"
        class="fg-required"
        aria-hidden="true"
      >*</span>
    </label>
    <div class="fg-pair">
      <select
        class="fg-select fg-phone-country"
        :class="sizeClass"
        :aria-label="messages.countryCode"
        :value="country"
        @change="setCountry"
        @blur="onBlur"
      >
        <option
          v-for="c in countries"
          :key="c.code"
          :value="c.code"
        >
          {{ c.name }} (+{{ c.dial }})
        </option>
      </select>
      <input
        :id="fieldId"
        class="fg-input"
        :class="sizeClass"
        type="tel"
        :name="node.name"
        autocomplete="tel-national"
        :placeholder="placeholder || undefined"
        :value="number"
        :aria-invalid="error ? 'true' : undefined"
        :aria-describedby="describedBy"
        @input="setNumber"
        @blur="onBlur"
      >
    </div>
    <p
      v-if="description"
      class="fg-description"
    >
      {{ description }}
    </p>
    <p
      v-if="error"
      :id="errorId"
      class="fg-error"
      role="alert"
    >
      {{ error }}
    </p>
  </div>
</template>
