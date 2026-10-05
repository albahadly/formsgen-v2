<script setup lang="ts">
// Phone: a plain tel input, or (props.countrySelect) a country-code select
// plus the national number (FgPhoneCountry; one per repeater item).
import { computed } from 'vue'
import { hasCountrySelect } from '../../countries'
import type { ElementNode } from '../../schema'
import FgPhoneCountry from './FgPhoneCountry.vue'
import FgText from './FgText.vue'

const props = defineProps<{ node: ElementNode; path: string }>()
const withCountry = computed(() => hasCountrySelect(props.node))
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
