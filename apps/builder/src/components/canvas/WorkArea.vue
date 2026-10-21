<script setup lang="ts">
import { useUiStore } from '@/stores/ui'
import CanvasPanel from './CanvasPanel.vue'
import CanvasToolbar from './CanvasToolbar.vue'
import CodePanel from './CodePanel.vue'
import PreviewPanel from './PreviewPanel.vue'

const ui = useUiStore()
</script>

<template>
  <div class="flex h-full flex-col">
    <CanvasToolbar />
    <div class="min-h-0 flex-1 bg-gray-100 dark:bg-gray-800">
      <CanvasPanel v-if="ui.viewMode === 'editor'" />
      <PreviewPanel v-else-if="ui.viewMode === 'preview'" />
      <CodePanel v-else />
    </div>
  </div>
</template>
