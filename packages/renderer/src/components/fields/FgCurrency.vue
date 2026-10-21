<script setup lang="ts">
// Currency: a number shown with the form locale's separators (money.ts),
// the currency sign as a prefix. While the field is being edited the text
// is what was typed; on blur it is formatted again and the value rounded.
import { computed, ref, watch } from 'vue'
import { currencyCode, currencySymbol, formatMoney, moneyDecimals, parseMoney } from '../../money'
import type { ElementNode } from '../../schema'
import { useField } from '../useField'
import FgAffix from './FgAffix.vue'
import FgFieldLabel from './FgFieldLabel.vue'
import FgFloat from './FgFloat.vue'

const props = defineProps<{ node: ElementNode; path: string }>()
const { ctx, value, error, description, placeholder, fieldId, errorId, describedBy, onBlur, sizeClass, suffix, floating } = useField(props)

const locale = computed(() => ctx.locale?.() ?? 'en')
const decimals = computed(() => moneyDecimals(props.node))
const prefix = computed(() => currencySymbol(currencyCode(props.node)))
const formatted = (): string => formatMoney(value.value, locale.value, decimals.value)

const text = ref(formatted())
const editing = ref(false)
// Values set elsewhere (a reset, saved answers, the address bar) show formatted.
watch([value, locale, decimals], () => {
  if (!editing.value) text.value = formatted()
})

function onInput(event: Event): void {
  editing.value = true
  text.value = (event.target as HTMLInputElement).value
  value.value = parseMoney(text.value, decimals.value)
}
function onBlurMoney(): void {
  editing.value = false
  text.value = formatted()
  onBlur()
}

const affixDescribedBy = computed(
  () =>
    [`${fieldId.value}-prefix`, suffix.value && `${fieldId.value}-suffix`, describedBy.value]
      .filter(Boolean)
      .join(' ') || undefined,
)
</script>

<template>
  <div
    class="fg-field"
    :class="{ 'fg-field--error': error }"
  >
    <FgFieldLabel
      v-if="!floating"
      :node="node"
      :for-id="fieldId"
    />
    <FgFloat
      :node="node"
      :for-id="fieldId"
      :floating="floating"
    >
      <FgAffix
        :id="fieldId"
        :prefix="prefix"
        :suffix="suffix"
      >
        <input
          :id="fieldId"
          class="fg-input"
          :class="sizeClass"
          type="text"
          inputmode="decimal"
          autocomplete="off"
          :name="node.name"
          :value="text"
          :placeholder="floating ? placeholder || ' ' : placeholder"
          :aria-invalid="error ? 'true' : undefined"
          :aria-describedby="affixDescribedBy"
          @input="onInput"
          @blur="onBlurMoney"
        >
      </FgAffix>
    </FgFloat>
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
