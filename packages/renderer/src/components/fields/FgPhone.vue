<script setup lang="ts">
// Phone: a plain tel input, or (props.countrySelect, outside repeaters) a
// country-code select plus the national number (FgPhoneCountry).
import { computed, inject } from 'vue'
import { ITEM_SCOPE } from '../../context'
import { hasCountrySelect } from '../../countries'
import type { ElementNode } from '../../schema'
import FgPhoneCountry from './FgPhoneCountry.vue'
import FgText from './FgText.vue'

const props = defineProps<{ node: ElementNode; path: string }>()
const scope = inject(ITEM_SCOPE, null)
const withCountry = computed(() => hasCountrySelect(props.node) && !scope)
</script>

<template>
  <FgPhoneCountry
    v-if="withCountry"
    :node="node"
    :path="path"
  />
  <FgText
    v-else
    :node="node"
    :path="path"
  />
</template>
