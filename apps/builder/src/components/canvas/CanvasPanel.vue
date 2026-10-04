<script setup lang="ts">
import { t } from '@/i18n'
import { useBuilderStore } from '@/stores/builder'
import BuilderNode from './BuilderNode.vue'
import { provideDesignContext } from './designContext'

const store = useBuilderStore()
provideDesignContext()

function onBackgroundClick(): void {
  store.select(null)
}
</script>

<template>
  <div
    class="h-full overflow-y-auto p-6"
    data-testid="panel-canvas"
    @click="onBackgroundClick"
  >
    <div class="fg-form mx-auto max-w-2xl rounded-lg bg-white p-6 shadow-sm">
      <div
        v-if="store.schema.tree.length > 0"
        class="flex flex-col gap-2"
      >
        <BuilderNode
          v-for="node in store.schema.tree"
          :key="node.id"
          :node="node"
          parent-path=""
        />
      </div>
      <p
        v-else
        class="py-16 text-center text-sm text-gray-400"
        data-testid="canvas-empty"
      >
        {{ t('canvas.empty') }}
      </p>
    </div>
  </div>
</template>
