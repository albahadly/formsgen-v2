<script setup lang="ts">
// The same form four times. Three are the standalone exports, one per CSS
// framework (src/forms/<framework>/EventRegistrationForm.vue, exactly what the
// builder's Download button writes); the host adds the framework's stylesheet
// (the vanilla component carries its own). The fourth is the renderer export:
// a small wrapper that hands the form's JSON schema to <FormsGenForm> from
// @formsgen/renderer. ?css=tailwind, ?css=bootstrap5 or ?css=renderer picks one.
import { defineAsyncComponent, ref, type Component } from 'vue'

type Variant = 'vanilla' | 'tailwind' | 'bootstrap5' | 'renderer'

const VARIANTS: Record<Variant, { label: string; load: () => Promise<{ default: Component }> }> = {
  vanilla: { label: 'Vanilla CSS', load: () => import('./forms/vanilla/EventRegistrationForm.vue') },
  tailwind: {
    label: 'Tailwind',
    load: async () => {
      await import('./tailwind.css')
      return import('./forms/tailwind/EventRegistrationForm.vue')
    },
  },
  bootstrap5: {
    label: 'Bootstrap 5',
    load: async () => {
      await import('bootstrap/dist/css/bootstrap.min.css')
      return import('./forms/bootstrap5/EventRegistrationForm.vue')
    },
  },
  renderer: { label: '@formsgen/renderer', load: () => import('./forms/renderer/EventRegistrationForm.vue') },
}

function variantFromUrl(): Variant {
  const requested = new URLSearchParams(window.location.search).get('css')
  return requested !== null && requested in VARIANTS ? (requested as Variant) : 'vanilla'
}

const variant = variantFromUrl()
const Form = defineAsyncComponent(VARIANTS[variant].load)
const last = ref<Record<string, unknown> | null>(null)
</script>

<template>
  <main style="max-width: 720px; margin: 24px auto; padding: 0 16px">
    <nav
      aria-label="Variant"
      style="display: flex; gap: 16px; margin-bottom: 24px"
    >
      <a
        v-for="(entry, key) in VARIANTS"
        :key="key"
        :href="`?css=${key}`"
        :aria-current="key === variant ? 'page' : undefined"
      >{{ entry.label }}</a>
    </nav>
    <p
      v-if="last"
      role="status"
      data-example-thanks
    >
      Thanks, {{ last.first_name }}: {{ last.seats }} seat(s) registered.
    </p>
    <!-- Every variant emits "submit" with the payload (the renderer wrapper
         passes the listener through to <FormsGenForm>). -->
    <Form @submit="(payload: Record<string, unknown>) => (last = payload)" />
  </main>
</template>
