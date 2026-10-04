<script setup lang="ts">
import { RENDERER_VERSION } from '@formsgen/renderer'
import { ref } from 'vue'
import CanvasPanel from '@/components/canvas/CanvasPanel.vue'
import PalettePanel from '@/components/palette/PalettePanel.vue'
import PropertiesPanel from '@/components/panel/PropertiesPanel.vue'
import TreePanel from '@/components/tree/TreePanel.vue'
import { t } from '@/i18n'

const showTree = ref(false)
</script>

<template>
  <div class="flex h-screen flex-col bg-gray-100 text-gray-900">
    <header class="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-2 shadow-sm">
      <h1 class="text-lg font-semibold">
        {{ t('app.title') }}
      </h1>
      <div class="flex items-center gap-3">
        <button
          type="button"
          class="rounded border px-2 py-1 text-xs font-medium"
          :class="showTree ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'"
          data-testid="tree-toggle"
          :aria-pressed="showTree"
          @click="showTree = !showTree"
        >
          {{ t('tree.title') }}
        </button>
        <span class="text-xs text-gray-500">renderer v{{ RENDERER_VERSION }}</span>
      </div>
    </header>
    <main class="flex flex-1 overflow-hidden">
      <aside class="w-64 shrink-0 overflow-y-auto border-e border-gray-200 bg-white p-3">
        <PalettePanel />
      </aside>
      <aside
        v-if="showTree"
        class="w-56 shrink-0 overflow-y-auto border-e border-gray-200 bg-white p-3"
      >
        <TreePanel />
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
