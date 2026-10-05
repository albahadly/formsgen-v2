<script setup lang="ts">
// Text add-ons around a control ("$", "kg"). Without any, the control
// renders alone. Their ids feed the control's aria-describedby.
defineProps<{ id: string; prefix: string | null; suffix: string | null }>()
</script>

<template>
  <div
    v-if="prefix || suffix"
    class="fg-affix-group"
  >
    <span
      v-if="prefix"
      :id="`${id}-prefix`"
      class="fg-affix"
    >{{ prefix }}</span>
    <slot />
    <span
      v-if="suffix"
      :id="`${id}-suffix`"
      class="fg-affix"
    >{{ suffix }}</span>
  </div>
  <slot v-else />
</template>
