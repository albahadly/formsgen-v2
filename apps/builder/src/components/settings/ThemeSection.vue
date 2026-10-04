<script setup lang="ts">
// Form-level theme (meta.theme): colors, font, corner radius and spacing.
// Every export maps these tokens onto its framework (see export/css).
import {
  FONT_PRESETS,
  RADIUS_PRESETS,
  SPACE_PRESETS,
  THEME_DEFAULTS,
  parseHexColor,
} from '@formsgen/renderer'
import { computed } from 'vue'
import { t } from '@/i18n'
import { useBuilderStore } from '@/stores/builder'
import ThemePresetField from './ThemePresetField.vue'

const builder = useBuilderStore()

const COLORS = [
  { token: 'color-primary', key: 'settings.primaryColor' },
  { token: 'color-text', key: 'settings.colorText' },
  { token: 'color-bg', key: 'settings.colorBg' },
  { token: 'color-border', key: 'settings.colorBorder' },
  { token: 'color-error', key: 'settings.colorError' },
] as const

const hasTheme = computed(() => Object.keys(builder.schema.meta.theme ?? {}).length > 0)

/** `<input type="color">` only takes #rrggbb. */
function colorInputValue(token: string): string {
  const rgb = parseHexColor(builder.schema.meta.theme?.[token] ?? THEME_DEFAULTS[token] ?? '')
  return rgb ? `#${rgb.map((c) => c.toString(16).padStart(2, '0')).join('')}` : '#000000'
}

function isSet(token: string): boolean {
  return builder.schema.meta.theme?.[token] !== undefined
}

function onColorInput(token: string, event: Event): void {
  builder.setThemeToken(token, (event.target as HTMLInputElement).value)
}
</script>

<template>
  <div
    class="flex flex-col gap-3 border-t border-gray-100 pt-3"
    data-testid="settings-theme"
  >
    <div class="flex items-center justify-between gap-2">
      <span class="text-xs font-semibold text-gray-700">{{ t('settings.theme') }}</span>
      <button
        type="button"
        class="rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40"
        :disabled="!hasTheme"
        data-testid="settings-theme-reset"
        @click="builder.resetTheme()"
      >
        {{ t('settings.themeReset') }}
      </button>
    </div>
    <p class="-mt-2 text-xs text-gray-400">
      {{ t('settings.themeHint') }}
    </p>

    <div class="grid grid-cols-5 gap-2">
      <div
        v-for="color in COLORS"
        :key="color.token"
        class="flex flex-col gap-1 text-xs font-medium text-gray-600"
      >
        <label
          :for="`settings-theme-${color.token}`"
          class="truncate"
          :title="t(color.key)"
        >{{ t(color.key) }}</label>
        <input
          :id="`settings-theme-${color.token}`"
          :value="colorInputValue(color.token)"
          type="color"
          class="h-8 w-full min-w-0 cursor-pointer rounded border"
          :class="isSet(color.token) ? 'border-indigo-400' : 'border-gray-300'"
          :data-testid="`settings-theme-${color.token}`"
          @input="onColorInput(color.token, $event)"
        >
        <button
          v-if="isSet(color.token)"
          type="button"
          class="self-start text-[11px] font-normal text-gray-400 hover:text-gray-700"
          :aria-label="`${t(color.key)}: ${t('settings.resetToken')}`"
          :data-testid="`settings-theme-${color.token}-reset`"
          @click="builder.setThemeToken(color.token, null)"
        >
          ↺ {{ t('settings.resetToken') }}
        </button>
      </div>
    </div>

    <div class="grid grid-cols-3 gap-3">
      <ThemePresetField
        token="font"
        :label="t('settings.font')"
        :presets="FONT_PRESETS"
        default-id="system"
        option-key="settings.font"
        testid="settings-theme-font"
      />
      <ThemePresetField
        token="radius"
        :label="t('settings.radius')"
        :presets="RADIUS_PRESETS"
        default-id="medium"
        option-key="settings.radius"
        testid="settings-theme-radius"
      />
      <ThemePresetField
        token="space"
        :label="t('settings.space')"
        :presets="SPACE_PRESETS"
        default-id="normal"
        option-key="settings.space"
        testid="settings-theme-space"
      />
    </div>
  </div>
</template>
