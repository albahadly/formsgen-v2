// Form theme tokens (meta.theme) — CSS-variable values the renderer and
// every export target apply. Token values are written into generated CSS,
// so they are validated (no characters that could end a declaration or
// rule) and a few values are derived (readable text on the primary color).

import type { ThemeTokens } from './schema'

/** Built-in look; a theme overrides any subset of these. */
export const THEME_DEFAULTS: Readonly<Record<string, string>> = {
  'color-bg': '#ffffff',
  'color-surface': '#f8fafc',
  'color-text': '#0f172a',
  'color-muted': '#64748b',
  'color-border': '#cbd5e1',
  'color-primary': '#4f46e5',
  'color-primary-contrast': '#ffffff',
  'color-error': '#dc2626',
  radius: '6px',
  space: '1rem',
  font: 'system-ui, sans-serif',
}

export interface ThemePreset {
  id: string
  value: string
}

export const FONT_PRESETS: readonly ThemePreset[] = [
  { id: 'system', value: 'system-ui, sans-serif' },
  { id: 'sans', value: '"Helvetica Neue", Arial, sans-serif' },
  { id: 'serif', value: 'Georgia, "Times New Roman", serif' },
  { id: 'mono', value: 'ui-monospace, Menlo, Consolas, monospace' },
  { id: 'arabic', value: 'Tahoma, "Segoe UI", "Noto Sans Arabic", sans-serif' },
]

export const RADIUS_PRESETS: readonly ThemePreset[] = [
  { id: 'none', value: '0px' },
  { id: 'small', value: '4px' },
  { id: 'medium', value: '6px' },
  { id: 'large', value: '12px' },
]

export const SPACE_PRESETS: readonly ThemePreset[] = [
  { id: 'compact', value: '0.75rem' },
  { id: 'normal', value: '1rem' },
  { id: 'relaxed', value: '1.5rem' },
]

export const THEME_TOKEN_PATTERN = /^[a-z][a-z0-9-]*$/

/**
 * A theme value that cannot end a CSS declaration/rule or reach markup:
 * no ; { } < > \ @ ` or line breaks anywhere (even inside quotes — `</style>`
 * in a string would still close an HTML style element), balanced quotes.
 */
export function isSafeThemeValue(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[^;{}<>\\@\n\r`]{1,120}$/.test(value) &&
    (value.match(/"/g)?.length ?? 0) % 2 === 0 &&
    (value.match(/'/g)?.length ?? 0) % 2 === 0
  )
}

/** [r, g, b] for #rgb / #rrggbb, else null. */
export function parseHexColor(value: string): [number, number, number] | null {
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value.trim())?.[1]
  if (!hex) return null
  const full = hex.length === 3 ? [...hex].map((c) => c + c).join('') : hex
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as [number, number, number]
}

function toHex([r, g, b]: [number, number, number]): string {
  return `#${[r, g, b].map((c) => Math.round(Math.max(0, Math.min(255, c))).toString(16).padStart(2, '0')).join('')}`
}

/** Darkens a hex color by `amount` (0–1); other formats pass through. */
export function shadeColor(value: string, amount: number): string {
  const rgb = parseHexColor(value)
  return rgb ? toHex(rgb.map((c) => c * (1 - amount)) as [number, number, number]) : value
}

/** Black or white text, whichever reads better on `background` (WCAG). */
export function readableTextOn(background: string): '#ffffff' | '#111827' {
  const rgb = parseHexColor(background)
  if (!rgb) return '#ffffff'
  const [r, g, b] = rgb.map((c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }) as [number, number, number]
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
  // contrast vs white: 1.05/(L+0.05); vs near-black (#111827, L≈0.009): (L+0.05)/0.059
  return 1.05 / (luminance + 0.05) >= (luminance + 0.05) / 0.059 ? '#ffffff' : '#111827'
}

/**
 * The theme as applied: only safe tokens, plus derived values — a primary
 * color without an explicit contrast color gets readable text.
 */
export function resolveTheme(theme: ThemeTokens | undefined): ThemeTokens {
  const resolved: ThemeTokens = {}
  for (const [token, value] of Object.entries(theme ?? {})) {
    if (THEME_TOKEN_PATTERN.test(token) && isSafeThemeValue(value)) resolved[token] = value
  }
  const primary = resolved['color-primary']
  if (primary && !resolved['color-primary-contrast']) {
    resolved['color-primary-contrast'] = readableTextOn(primary)
  }
  return resolved
}

/** The resolved theme as `--fg-*` custom properties (for a style binding). */
export function themeCssVariables(theme: ThemeTokens | undefined): Record<string, string> {
  const vars: Record<string, string> = {}
  for (const [token, value] of Object.entries(resolveTheme(theme))) vars[`--fg-${token}`] = value
  return vars
}

/**
 * A custom background or text color defines its own color scheme, so the
 * automatic dark mode must not flip the colors the author did not set.
 */
export function pinsLightScheme(theme: ThemeTokens | undefined): boolean {
  return Boolean(theme?.['color-bg'] || theme?.['color-text'])
}

/** Value of a token, falling back to the built-in default. */
export function themeValue(theme: ThemeTokens, token: string): string {
  return theme[token] ?? THEME_DEFAULTS[token] ?? ''
}
