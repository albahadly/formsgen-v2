<script setup lang="ts">
import { t } from '@/i18n'
import { useUiStore, type Device, type ViewMode } from '@/stores/ui'

const ui = useUiStore()

const views: ViewMode[] = ['editor', 'preview', 'code']
const devices: Device[] = ['mobile', 'tablet', 'desktop']
</script>

<template>
  <div class="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2">
    <div
      class="flex rounded-md bg-gray-100 dark:bg-gray-800 p-0.5"
      role="tablist"
      :aria-label="t('toolbar.view')"
    >
      <button
        v-for="view in views"
        :key="view"
        type="button"
        role="tab"
        class="rounded px-2.5 py-1 text-xs font-medium"
        :class="ui.viewMode === view ? 'bg-white dark:bg-gray-700 text-indigo-700 dark:text-indigo-200 shadow-sm' : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'"
        :aria-selected="ui.viewMode === view"
        :data-testid="`view-${view}`"
        @click="ui.setViewMode(view)"
      >
        {{ t(`toolbar.view.${view}`) }}
      </button>
    </div>

    <div class="flex items-center gap-2">
      <div
        v-if="ui.viewMode !== 'code'"
        class="flex rounded-md bg-gray-100 dark:bg-gray-800 p-0.5"
        :aria-label="t('toolbar.device')"
      >
        <button
          v-for="device in devices"
          :key="device"
          type="button"
          class="rounded px-2.5 py-1 text-xs font-medium"
          :class="ui.device === device ? 'bg-white dark:bg-gray-700 text-indigo-700 dark:text-indigo-200 shadow-sm' : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'"
          :data-testid="`device-${device}`"
          :title="t(`toolbar.device.${device}`)"
          @click="ui.setDevice(device)"
        >
          {{ t(`toolbar.device.${device}`) }}
        </button>
      </div>

      <button
        v-if="ui.viewMode !== 'code'"
        type="button"
        class="rounded-md border border-gray-300 dark:border-gray-600 px-2.5 py-1 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
        data-testid="preview-theme-toggle"
        :aria-pressed="ui.previewTheme === 'dark'"
        :title="t('toolbar.theme')"
        @click="ui.togglePreviewTheme()"
      >
        {{ ui.previewTheme === 'dark' ? '🌙' : '☀️' }}
      </button>

      <button
        type="button"
        class="rounded-md border border-gray-300 dark:border-gray-600 px-2.5 py-1 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
        data-testid="open-settings"
        @click="ui.openSettings()"
      >
        ⚙ {{ t('toolbar.settings') }}
      </button>
    </div>
  </div>
</template>
