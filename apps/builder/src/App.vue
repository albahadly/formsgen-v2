<script setup lang="ts">
import { RENDERER_VERSION } from '@formsgen/renderer'
import CanvasPanel from '@/components/canvas/CanvasPanel.vue'
import PalettePanel from '@/components/palette/PalettePanel.vue'
import PropertiesPanel from '@/components/panel/PropertiesPanel.vue'
import { t } from '@/i18n'
</script>

<template>
  <div class="flex h-screen flex-col bg-gray-100 text-gray-900">
    <header class="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-2 shadow-sm">
      <h1 class="text-lg font-semibold">
        {{ t('app.title') }}
      </h1>
      <span class="text-xs text-gray-500">renderer v{{ RENDERER_VERSION }}</span>
    </header>
    <main class="flex flex-1 overflow-hidden">
      <aside class="w-64 shrink-0 overflow-y-auto border-e border-gray-200 bg-white p-3">
        <PalettePanel />
      </aside>
      <section class="flex-1 overflow-hidden">
        <CanvasPanel />
      </section>
      <aside class="w-80 shrink-0 overflow-y-auto border-s border-gray-200 bg-white p-3">
        <PropertiesPanel />
      </aside>
    </main>
  </div>
</template>
