<script setup lang="ts">
// Form-level theme (meta.theme): colors, font, corner radius and spacing.
// Every export maps these tokens onto its framework (see export/css).
import {
  FONT_PRESETS,
  RADIUS_PRESETS,
  SPACE_PRESETS,
  THEME_DEFAULTS,
  THEME_PALETTES,
  parseHexColor,
  type ThemePalette,
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
  { token: 'color-surface', key: 'settings.colorSurface' },
  { token: 'color-muted', key: 'settings.colorMuted' },
  { token: 'color-border', key: 'settings.colorBorder' },
  { token: 'color-error', key: 'settings.colorError' },
] as const

const DEFAULT_PALETTE: ThemePalette = {
  id: 'default',
  colors: {
    'color-primary': THEME_DEFAULTS['color-primary']!,
    'color-text': THEME_DEFAULTS['color-text']!,
    'color-bg': THEME_DEFAULTS['color-bg']!,
    'color-surface': THEME_DEFAULTS['color-surface']!,
    'color-muted': THEME_DEFAULTS['color-muted']!,
    'color-border': THEME_DEFAULTS['color-border']!,
    'color-error': THEME_DEFAULTS['color-error']!,
  },
}
const PALETTES = [DEFAULT_PALETTE, ...THEME_PALETTES]

/** The palette the theme's colors match exactly (default: no colors set). */
const activePalette = computed(() => {
  const colors = Object.entries(builder.schema.meta.theme ?? {}).filter(([token]) => token.startsWith('color-'))
  if (colors.length === 0) return 'default'
  return THEME_PALETTES.find(
    (palette) =>
      colors.length === Object.keys(palette.colors).length &&
      colors.every(([token, value]) => palette.colors[token as keyof ThemePalette['colors']] === value),
  )?.id
})

function applyPalette(palette: ThemePalette): void {
  builder.applyThemeColors(palette.id === 'default' ? null : palette.colors)
}

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

    <div
      class="grid grid-cols-7 gap-2"
      role="group"
      :aria-label="t('settings.palettes')"
    >
      <button
        v-for="palette in PALETTES"
        :key="palette.id"
        type="button"
        class="flex flex-col items-center gap-1 rounded border p-1 text-[11px] text-gray-600 hover:border-indigo-300"
        :class="activePalette === palette.id ? 'border-indigo-500 ring-1 ring-indigo-300' : 'border-gray-200'"
        :aria-pressed="activePalette === palette.id"
        :data-testid="`settings-palette-${palette.id}`"
        @click="applyPalette(palette)"
      >
        <span
          class="flex h-8 w-full items-center justify-center gap-1 rounded-sm border text-xs font-semibold"
          :style="{
            background: palette.colors['color-bg'],
            color: palette.colors['color-text'],
            borderColor: palette.colors['color-border'],
          }"
          aria-hidden="true"
        >
          Aa
          <span
            class="h-3 w-3 rounded-full"
            :style="{ background: palette.colors['color-primary'] }"
          />
        </span>
        {{ t(`settings.palette.${palette.id}`) }}
      </button>
    </div>

    <div class="grid grid-cols-4 gap-2">
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
