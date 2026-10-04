<script setup lang="ts">
import { RENDERER_VERSION } from '@formsgen/renderer'
</script>

<template>
  <div class="flex h-screen flex-col bg-gray-100 text-gray-900">
    <header class="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-2 shadow-sm">
      <h1 class="text-lg font-semibold">
        FormsGen Builder
      </h1>
      <span class="text-xs text-gray-500">renderer v{{ RENDERER_VERSION }}</span>
    </header>
    <main class="flex flex-1 overflow-hidden">
      <aside
        data-testid="panel-palette"
        class="w-64 shrink-0 border-e border-gray-200 bg-white p-3 text-sm text-gray-500"
      >
        Palette — phase 4
      </aside>
      <section
        data-testid="panel-canvas"
        class="flex flex-1 items-center justify-center p-6 text-sm text-gray-400"
      >
        Canvas — phase 4
      </section>
      <aside
        data-testid="panel-properties"
        class="w-80 shrink-0 border-s border-gray-200 bg-white p-3 text-sm text-gray-500"
      >
        Properties — phase 4
      </aside>
    </main>
  </div>
</template>
